/**
 * Double encryption for sensitive payment data.
 * - Data is encrypted with AES-256-GCM before being stored in Firestore.
 * - Firebase already encrypts at rest; this adds application-level encryption
 *   so only the backend (with PAYMENT_ENCRYPTION_KEY) can read the payload.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey() {
  const raw = process.env.PAYMENT_ENCRYPTION_KEY;
  if (!raw) return null;
  if (Buffer.isBuffer(raw)) return raw.slice(0, KEY_LENGTH);
  try {
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length >= KEY_LENGTH) return decoded.slice(0, KEY_LENGTH);
  } catch {
    // not base64
  }
  if (raw.length >= 16) return crypto.scryptSync(raw, 'monet-payment-salt', KEY_LENGTH);
  return null;
}

export function hasEncryption() {
  return !!getKey();
}

/**
 * Encrypt a plaintext object (will be JSON.stringify'd).
 * If PAYMENT_ENCRYPTION_KEY is not set, returns null (caller may store plaintext or skip).
 * @param {object} payload - Object to encrypt (e.g. { last4, exp_month, exp_year, holder_name })
 * @returns {string | null} base64(iv || ciphertext || authTag) or null
 */
export function encryptPaymentData(payload) {
  const key = getKey();
  if (!key) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const str = JSON.stringify(payload);
  const enc = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString('base64');
}


/**
 * Decrypt a blob produced by encryptPaymentData.
 * If PAYMENT_ENCRYPTION_KEY is not set or blob is invalid, returns null.
 * @param {string} blob - base64(iv || ciphertext || authTag)
 * @returns {object | null} Decrypted object or null
 */
export function decryptPaymentData(blob) {
  const key = getKey();
  if (!key) return null;
  const buf = Buffer.from(blob, 'base64');
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    return null;
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH);
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const str = decipher.update(ciphertext) + decipher.final('utf8');
    return JSON.parse(str);
  } catch {
    return null;
  }
}
