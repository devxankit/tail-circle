import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as addressService from './address.service.js';

/** GET /addresses */
export const list = asyncHandler(async (req, res) => {
  const addresses = await addressService.listAddresses(req.user.id);
  sendSuccess(res, { data: addresses });
});

/** POST /addresses */
export const create = asyncHandler(async (req, res) => {
  const address = await addressService.createAddress(req.user.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Address saved', data: address });
});

/** PATCH /addresses/:id */
export const update = asyncHandler(async (req, res) => {
  const address = await addressService.updateAddress(req.user.id, req.params.id, req.body);
  sendSuccess(res, { message: 'Address updated', data: address });
});

/** DELETE /addresses/:id */
export const remove = asyncHandler(async (req, res) => {
  await addressService.deleteAddress(req.user.id, req.params.id);
  sendSuccess(res, { message: 'Address removed' });
});
