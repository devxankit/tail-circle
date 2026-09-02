import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import { isRedisReady } from './config/redis.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';
import { webhook as razorpayWebhook } from './modules/payment/payment.controller.js';

import { connectDatabase } from './config/database.js';

const app = express();

// Security & platform middleware
app.set('trust proxy', 1);

// Ensure MongoDB database is connected in serverless/Vercel environments
app.use(async (_req, _res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    next();
  } catch (err) {
    next(err);
  }
});

const allowedOrigins = env.corsOrigin || [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const isVercel = /\.vercel\.app$/.test(origin);
    const isLocalhost = /localhost|127\.0\.0\.1/.test(origin);
    const isListed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');

    if (isVercel || isLocalhost || isListed) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

app.use(cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());

// Razorpay webhook needs the RAW body for signature verification —
// must be registered BEFORE the JSON parser.
app.post(
  `${env.apiPrefix}/payments/webhook`,
  express.raw({ type: 'application/json' }),
  razorpayWebhook
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
/**
 * Endpoints the clients poll on a timer — the call-context fallback and the
 * connectivity probe. Left in, they bury every real request in the dev log.
 * Only *successful* polls are skipped, so a route that starts failing still
 * shows up.
 */
const POLLED_ROUTES = new Set([`${env.apiPrefix}/consults/active`, '/health']);
if (!env.isProd) {
  app.use(
    morgan('dev', {
      skip: (req, res) => res.statusCode < 400 && POLLED_ROUTES.has(req.path),
    })
  );
}

// Liveness probe — process is up. Cheap, never touches dependencies.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// Readiness probe — safe to receive traffic only when the datastore is up.
// Redis is treated as degraded-but-ready (the API tolerates it being down).
app.get('/health/ready', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1; // 1 = connected
  const redisUp = isRedisReady();
  const ready = dbUp; // Mongo is the hard dependency; Redis is optional.
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not-ready',
    checks: {
      mongodb: dbUp ? 'up' : 'down',
      redis: redisUp ? 'up' : 'degraded',
    },
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// API
app.use(env.apiPrefix, apiLimiter, apiRoutes);

// 404 + centralized error handling (must be last)
app.use(notFound);
app.use(errorHandler);

export default app;

// force restart
