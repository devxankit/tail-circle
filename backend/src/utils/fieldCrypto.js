import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Reversible field-level encryption for sensitive data at rest (vendor bank
 * account numbers). AES-256-GCM with a key derived from the JWT secret via
 * scrypt — no extra env var to provision. Ciphertext format:
 *   v1:<iv_b64>:<tag_b64>:<data_b64>
 * NOTE: rotating JWT_ACCESS_SECRET makes existing ciphertext unreadable.
 */
const KEY = crypto.scryptSync(env.jwt.accessSecret, 'tc-field-crypto', 32);

export function encryptField(plain) {
  if (plain == null || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
}

export function decryptField(blob) {
  if (!blob) return null;
  try {
    const [ver, ivB64, tagB64, dataB64] = String(blob).split(':');
    if (ver !== 'v1') return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Last-4 mask for display: "•••• 4829". Never returns the full number. */
export function maskAccount(blob) {
  const plain = decryptField(blob);
  if (!plain) return null;
  return `•••• ${plain.slice(-4)}`;
}
