import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Configure the Cloudinary SDK once at startup. Credentials come from
 * env (never hard-code them). `secure: true` forces https URLs.
 */
cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true,
});

export const isCloudinaryConfigured = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
);

if (!isCloudinaryConfigured && env.nodeEnv !== 'test') {
  logger.warn(
    'Cloudinary is not fully configured — set CLOUDINARY_* in .env to enable uploads.'
  );
}

export { cloudinary };
export default cloudinary;
