/**
 * Single place for phone normalization. Canonical storage format is
 * `+<countrycode><number>`, defaulting to India: `+91XXXXXXXXXX`.
 * Every auth path (OTP request/verify) must pass through this so a user
 * can never end up with two accounts for `98765...` and `+9198765...`.
 */
export function normalizePhone(input) {
  const digits = String(input).replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
}

/** Digits-only with country code (`91XXXXXXXXXX`) — what SMS gateways want. */
export function phoneForSms(input) {
  return normalizePhone(input).slice(1);
}
