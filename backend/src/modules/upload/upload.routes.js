import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { uploadImage, uploadFile, handleMulter } from '../../middleware/upload.js';
import { uploadSingle, uploadMultiple, remove } from './upload.controller.js';

const router = Router();

// All upload routes require an authenticated user.
router.use(authenticate);

// Single image  — multipart/form-data, field "file"
router.post('/image', handleMulter(uploadImage.single('file')), uploadSingle);

// Multiple files — multipart/form-data, field "files" (max 10)
router.post('/files', handleMulter(uploadFile.array('files', 10)), uploadMultiple);

// Delete an asset — JSON body { publicId, resourceType? }
router.delete('/', remove);

export default router;
