import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import * as uploadService from './upload.service.js';

/** POST /uploads/image — single image (field name: "file"). */
export const uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file provided (field "file")');
  const folder = req.body.folder || undefined;
  const asset = await uploadService.uploadBuffer(req.file, { folder });
  sendSuccess(res, { statusCode: 201, message: 'Uploaded', data: asset });
});

/** POST /uploads/files — multiple files (field name: "files"). */
export const uploadMultiple = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('No files provided (field "files")');
  }
  const folder = req.body.folder || undefined;
  const assets = await uploadService.uploadBuffers(req.files, { folder });
  sendSuccess(res, {
    statusCode: 201,
    message: `Uploaded ${assets.length} file(s)`,
    data: assets,
  });
});

/** DELETE /uploads — remove an asset. Body: { publicId, resourceType? }.
 *  publicId is taken from the body since it can contain folder slashes. */
export const remove = asyncHandler(async (req, res) => {
  const { publicId, resourceType = 'image' } = req.body;
  if (!publicId) throw ApiError.badRequest('publicId is required');
  const result = await uploadService.deleteAsset(publicId, resourceType);
  sendSuccess(res, { message: 'Deleted', data: result });
});
