/* Verifies Cloudinary credentials by uploading a 1x1 PNG then deleting it. */
import { isCloudinaryConfigured } from '../src/config/cloudinary.js';
import { uploadBuffer, deleteAsset } from '../src/modules/upload/upload.service.js';

const PNG_1x1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

(async () => {
  console.log('Cloudinary configured:', isCloudinaryConfigured);
  if (!isCloudinaryConfigured) process.exit(1);

  const file = {
    buffer: Buffer.from(PNG_1x1, 'base64'),
    mimetype: 'image/png',
    originalname: 'ping.png',
  };

  try {
    const asset = await uploadBuffer(file, { folder: 'tailcircle/_healthcheck' });
    console.log('PASS upload ->', asset.url);
    const del = await deleteAsset(asset.publicId, 'image');
    console.log('PASS delete ->', del);
    process.exit(0);
  } catch (e) {
    console.error('FAIL', e.statusCode || '', e.message);
    process.exit(1);
  }
})();
