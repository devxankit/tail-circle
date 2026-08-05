import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Connect to MongoDB. Retries are left to the deployment platform;
 * a failed initial connection is fatal so the process can be restarted.
 */
let isListenerAttached = false;

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);

  if (!isListenerAttached) {
    mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
    mongoose.connection.on('error', (err) => logger.error('MongoDB error', err));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
    isListenerAttached = true;
  }

  if (mongoose.connection.readyState !== 2) {
    await mongoose.connect(env.mongoUri);
  }
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.connection.close();
}
