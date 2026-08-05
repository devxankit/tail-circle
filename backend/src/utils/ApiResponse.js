/**
 * Standard success envelope so the frontend always receives a
 * predictable shape: { success, message, data, meta }.
 */
export function sendSuccess(res, { statusCode = 200, message = 'OK', data = null, meta } = {}) {
  const body = { success: true, message, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
}

export default sendSuccess;
