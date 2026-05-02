import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';
import { auth } from './firebase';

const functions = getFunctions(app, 'us-central1');

async function ensureTokenRefreshed() {
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  try {
    // Force-refresh the token so callables see the latest auth state (important after sign-in)
    await currentUser.getIdToken(true);
  } catch (err) {
    // ignore — the callable will return a friendly error if unauthenticated
    console.warn('Failed to refresh ID token', err);
  }
}

export async function createWalletUser(name, phone, currency = 'USD') {
  const fn = httpsCallable(functions, 'createWalletUser');
  const { data } = await fn({ name, phone, currency });
  return data;
}

export async function initiateTransfer(receiver_uid, amount_usd, funding_source) {
  const fn = httpsCallable(functions, 'initiateTransfer');
  const { data } = await fn({ receiver_uid, amount_usd, funding_source });
  return data;
}

export async function addMoneyToWallet(amount_usd, source) {
  const fn = httpsCallable(functions, 'addMoneyToWallet');
  const { data } = await fn({ amount_usd, source });
  return data;
}

export async function initiatePayout(amount_usd, provider) {
  const fn = httpsCallable(functions, 'initiatePayout');
  const { data } = await fn({ amount_usd, provider });
  return data;
}

export async function uploadProfilePhoto(imageBase64) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be signed in to upload a photo');
  await currentUser.getIdToken(true);
  const fn = httpsCallable(functions, 'uploadProfilePhoto');
  const { data } = await fn({ imageBase64 });
  return data;
}

/** Save card or bank payment method (encrypted on server; optional Swiftech vault). */
export async function savePaymentMethod(type, payload) {
  const fn = httpsCallable(functions, 'savePaymentMethod');
  const { data } = await fn({ type, card: type === 'card' ? payload : undefined, bank: type === 'bank' ? payload : undefined });
  return data;
}

/** Get decrypted payment method display info (no full numbers). */
export async function getPaymentMethods() {
  const fn = httpsCallable(functions, 'getPaymentMethods');
  const { data } = await fn();
  return data;
}

// --- Admin callables ---
export async function adminDeleteUser(uid) {
  await ensureTokenRefreshed();
  const fn = httpsCallable(functions, 'adminDeleteUser');
  const { data } = await fn({ uid });
  return data;
}

export async function adminEditUser(uid, updates) {
  await ensureTokenRefreshed();
  const fn = httpsCallable(functions, 'adminEditUser');
  const { data } = await fn({ uid, updates });
  return data;
}

export async function adminCancelTransaction(owner_uid, transaction_id) {
  await ensureTokenRefreshed();
  const fn = httpsCallable(functions, 'adminCancelTransaction');
  const { data } = await fn({ owner_uid, transaction_id });
  return data;
}

export async function adminCreateAd({ title, message, image_url, active = true }) {
  await ensureTokenRefreshed();
  const fn = httpsCallable(functions, 'adminCreateAd');
  const { data } = await fn({ title, message, image_url, active });
  return data;
}

export async function adminUpdateAd(id, updates) {
  await ensureTokenRefreshed();
  const fn = httpsCallable(functions, 'adminUpdateAd');
  const { data } = await fn({ id, updates });
  return data;
}

export async function adminDeleteAd(id) {
  await ensureTokenRefreshed();
  const fn = httpsCallable(functions, 'adminDeleteAd');
  const { data } = await fn({ id });
  return data;
}

export async function adminUploadAdImage(imageBase64, contentType) {
  await ensureTokenRefreshed();
  const fn = httpsCallable(functions, 'adminUploadAdImage');
  const { data } = await fn({ imageBase64, contentType });
  return data;
}
