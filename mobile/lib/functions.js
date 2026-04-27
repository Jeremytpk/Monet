import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';
import { auth } from './firebase';

const functions = getFunctions(app, 'us-central1');

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
