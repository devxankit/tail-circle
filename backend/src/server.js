import http from 'node:http';
import app from './app.js';
import { env, assertProductionConfig } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { initFirebase } from './config/firebase.js';
import { initSocket, getIO } from './sockets/index.js';
import { logger } from './utils/logger.js';

async function start() {
  try {
    // Fail fast on insecure/missing config before touching any dependency.
    assertProductionConfig();

    await connectDatabase();
    await connectRedis(); // non-fatal — API degrades gracefully without Redis
    initFirebase(); // non-fatal — chat/push disabled until service account exists

    const server = http.createServer(app);
    initSocket(server);

    server.listen(env.port, () => {
      logger.info(`🚀 TailCircle API running on http://localhost:${env.port}${env.apiPrefix}`);
      logger.info(`   Environment: ${env.nodeEnv}`);
    });

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
