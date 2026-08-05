import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { phoneForSms } from '../utils/phone.js';

/**
 * SMS India Hub gateway (http://cloud.smsindiahub.in/vendorsms/pushsms.aspx).
 * GET with querystring params; responds with JSON like
 *   { ErrorCode: "000", ErrorMessage: "Success", JobId, MessageData }
 * ErrorCode "000" = accepted.
 *
 * When SMS_INDIA_ENABLED=false the message is logged instead of sent
 * (dev mode). OTP codes are NEVER logged in production.
 */

const SUCCESS_CODE = '000';

export async function sendSms(phone, message) {
  if (!env.sms.enabled) {
    if (!env.isProd) logger.info(`[sms:dev] to ${phone}: ${message}`);
    return { sent: false, dev: true };
  }

  const url = new URL(env.sms.baseUrl);
  url.searchParams.set('APIKey', env.sms.apiKey);
  url.searchParams.set('msisdn', phoneForSms(phone));
  url.searchParams.set('sid', env.sms.senderId);
  url.searchParams.set('msg', message);
  url.searchParams.set('fl', '0');
  url.searchParams.set('gwid', env.sms.gwid);
  if (env.sms.peId) url.searchParams.set('PEID', env.sms.peId);
  if (env.sms.dltTemplateId) url.searchParams.set('DLTTemplateId', env.sms.dltTemplateId);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const body = await res.text();

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = { ErrorMessage: body };
    }

    if (!res.ok || (parsed.ErrorCode && parsed.ErrorCode !== SUCCESS_CODE)) {
      logger.error(
        `SMS send failed for ${phone}: ${parsed.ErrorCode || res.status} ${parsed.ErrorMessage || ''}`
      );
      return { sent: false, error: parsed.ErrorMessage || `HTTP ${res.status}` };
    }

    logger.info(`SMS accepted for ${phone} (job ${parsed.JobId || 'n/a'})`);
    return { sent: true, jobId: parsed.JobId };
  } catch (err) {
    logger.error(`SMS gateway unreachable for ${phone}: ${err.message}`);
    return { sent: false, error: err.message };
  }
}

/**
 * Send the login OTP. Throws 503 only when the gateway hard-fails in
 * production (user must know the code isn't coming); dev mode always passes.
 */
export async function sendOtpSms(phone, code, expiresMinutes) {
  // Must match the DLT-registered "OTP" template EXACTLY, or SMS India Hub
  // rejects the send. Registered template (##var## → brand, then code):
  //   Welcome to the ##var## powered by Appzeto.Your OTP for registration is ##var##.BGADEC
  const message = `Welcome to the TailCircle powered by Appzeto.Your OTP for registration is ${code}.BGADEC`;
  const result = await sendSms(phone, message);
  if (env.isProd && env.sms.enabled && !result.sent) {
    throw ApiError.serviceUnavailable('Could not send OTP right now, please retry shortly');
  }
  return result;
}
