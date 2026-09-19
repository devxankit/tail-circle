import http from 'node:http';
import app from './app.js';
import { env, assertProductionConfig } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { initFirebase } from './config/firebase.js';
import { ensureDefaultPlans } from './modules/subscription/subscription.service.js';
import { initSocket, getIO } from './sockets/index.js';
import { applyDueCommissionSchedules } from './modules/admin/admin.finance.service.js';
import { runComplianceSweeps } from './modules/compliance/compliance.sweeps.js';
import { logger } from './utils/logger.js';

async function start() {
  try {
    // Fail fast on insecure/missing config before touching any dependency.
    assertProductionConfig();

    await connectDatabase();
    await connectRedis(); // non-fatal — API degrades gracefully without Redis
    initFirebase(); // non-fatal — chat/push disabled until service account exists

    /*
     * The match deck refuses every like when there is no plan to draw an
     * allowance from, so the starter catalog is created on first boot. It is a
     * no-op the moment any plan exists — an admin's edits, and their deletions,
     * are never undone by a restart.
     */
    await ensureDefaultPlans().catch((err) =>
      logger.warn(`Could not seed match subscription plans: ${err.message}`)
    );

    const server = http.createServer(app);
    initSocket(server);

    server.listen(env.port, () => {
      logger.info(`🚀 TailCircle API running on http://localhost:${env.port}${env.apiPrefix}`);
      logger.info(`   Environment: ${env.nodeEnv}`);
    });

    /*
     * Commission changes an operator dated into the future.
     *
     * Polled rather than timer-per-row so a restart cannot lose a pending
     * change, and applied through the ordinary admin setter so each one is
     * bounds-checked and audited like a manual edit. A minute of latency is
     * immaterial for a commission rate, and each row is claimed atomically so
     * several servers running this loop apply it exactly once.
     */
    const runDueCommissionSchedules = () =>
      applyDueCommissionSchedules()
        .then((ids) => {
          if (ids.length) logger.info(`Applied ${ids.length} scheduled commission change(s)`);
        })
        .catch((err) => logger.warn(`Commission schedule sweep failed: ${err.message}`));

    runDueCommissionSchedules();
    const scheduleTimer = setInterval(runDueCommissionSchedules, 60_000);
    scheduleTimer.unref();

    /*
     * Partner SLA enforcement.
     *
     * Three things nobody was watching: booking requests left unanswered,
     * paid bookings that sail past their service date untouched, and paid
     * orders that never ship. Each one is a customer who paid and got nothing,
     * and each was previously discovered only when that customer complained.
     *
     * Polled on the same pattern as the commission sweep above, for the same
     * reasons — a restart cannot lose work, and the sweeps are idempotent
     * (unique on vendor+type+reference), so several instances running this loop
     * record each violation exactly once. Five minutes rather than one: these
     * measure in hours and days, and the sweep touches more rows.
     */
    const runComplianceSweep = () =>
      runComplianceSweeps()
        .then((out) => {
          const flagged =
            (out.undeliveredServices?.flagged || 0) +
            (out.stalledOrders?.flagged || 0) +
            (out.unansweredBookings?.violations || 0);
          if (flagged) logger.warn(`Compliance sweep flagged ${flagged} SLA breach(es)`);
        })
        .catch((err) => logger.warn(`Compliance sweep failed: ${err.message}`));

    // Delayed first run so a cold boot finishes wiring up before it scans.
    setTimeout(runComplianceSweep, 30_000).unref();
    const complianceTimer = setInterval(runComplianceSweep, 5 * 60_000);
    complianceTimer.unref();

    let shuttingDown = false;
    const shutdown = async (signal) => {
      if (shuttingDown) return; // ignore repeated signals
      shuttingDown = true;
      logger.warn(`${signal} received — shutting down gracefully`);

      // Force-exit if graceful close hangs.
      const forceTimer = setTimeout(() => {
        logger.error('Graceful shutdown timed out — forcing exit');
        process.exit(1);
      }, 10_000).unref();

      try {
        const io = getIO();
        if (io) await io.close(); // stop accepting sockets, flush the adapter
        await new Promise((resolve) => server.close(resolve)); // drain HTTP
        await disconnectDatabase();
        await disconnectRedis();
        clearTimeout(forceTimer);
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', err);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
  process.exit(1);
});

start();

// Trigger nodemon restart
