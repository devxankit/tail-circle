import { cloudinary, isCloudinaryConfigured } from '../../config/cloudinary.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

/** Normalize a Cloudinary result into the shape we return to clients. */
function toAsset(result) {
  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    originalFilename: result.original_filename,
    createdAt: result.created_at,
  };
}

/**
 * Stream a single in-memory file buffer to Cloudinary.
 *
 * @param {{buffer: Buffer, mimetype: string, originalname: string}} file
 * @param {{folder?: string, resourceType?: 'image'|'video'|'raw'|'auto', optimize?: boolean}} [opts]
 */
export function uploadBuffer(file, opts = {}) {
  if (!file || !file.buffer) throw ApiError.badRequest('No file provided');

  if (!isCloudinaryConfigured) {
    const dataUrl = `data:${file.mimetype || 'image/jpeg'};base64,${file.buffer.toString('base64')}`;
    return Promise.resolve({
      url: dataUrl,
      publicId: `local_${Date.now()}`,
      resourceType: 'image',
      format: (file.mimetype || '').split('/')[1] || 'jpg',
      bytes: file.buffer.length,
      originalFilename: file.originalname || 'upload.jpg',
      createdAt: new Date().toISOString(),
    });
  }

  const isImage = file.mimetype.startsWith('image/');
  const {
    folder = env.cloudinary.folder,
    resourceType = 'auto',
    optimize = true,
  } = opts;

  const options = {
    folder,
    resource_type: resourceType,
    // Deliver the best format/quality automatically for images (smaller,
    // faster) without a separate transformation step on read.
    ...(isImage && optimize
      ? { quality: 'auto', fetch_format: 'auto' }
      : {}),
  };

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(ApiError.internal(err.message || 'Upload failed'));
      resolve(toAsset(result));
    });
    stream.end(file.buffer);
  });
}

/** Upload many files in parallel. */
export function uploadBuffers(files = [], opts = {}) {
  return Promise.all(files.map((f) => uploadBuffer(f, opts)));
}

/** Delete an asset by its Cloudinary public_id. */
export async function deleteAsset(publicId, resourceType = 'image') {
  if (!isCloudinaryConfigured) {
    throw ApiError.internal('Cloudinary is not configured on the server');
  }
  if (!publicId) throw ApiError.badRequest('publicId is required');

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
  if (result.result !== 'ok' && result.result !== 'not found') {
    throw ApiError.internal(`Failed to delete asset: ${result.result}`);
  }
  return { publicId, deleted: result.result === 'ok' };
}
