/**
 * Monet Cloud Functions
 * - Bridge Firebase ↔ Swiftech
 * - Update balances and ledger on webhook
 * - Callable: initiateTransfer, initiatePayout, createWalletUser
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { initializeApp } from 'firebase-admin/app';
import { createTransfer, createPayout, verifyWebhookSignature, savePaymentSource } from './swiftech.js';
import { encryptPaymentData, decryptPaymentData } from './encryption.js';

initializeApp();
const db = getFirestore();
const storage = getStorage();

// ---------- Helpers ----------

function generateWalletId(uid) {
  const slug = uid.slice(0, 8) + Math.random().toString(36).slice(2, 10);
  return `monet_${slug}`;
}

async function getReceiverDoc(receiver_uid) {
  const ref = db.collection('users').doc(receiver_uid);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Receiver user not found');
  return { ref, data: snap.data() };
}

async function getSenderDoc(sender_uid) {
  const ref = db.collection('users').doc(sender_uid);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Sender user not found');
  return { ref, data: snap.data() };
}

// ---------- Callable: Create wallet user (onboarding) ----------

export const createWalletUser = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const { name, phone, currency = 'USD' } = request.data || {};
    if (!name || !phone) throw new HttpsError('invalid-argument', 'name and phone required');

    const uid = request.auth.uid;
    const wallet_id = generateWalletId(uid);
    const userRef = db.collection('users').doc(uid);

    await userRef.set({
      name,
      phone,
      wallet_balance: 0,
      currency,
      wallet_id,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true, wallet_id };
  }
);

// ---------- Callable: Upload profile photo (base64 → Storage, returns URL) ----------

export const uploadProfilePhoto = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const { imageBase64 } = request.data || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new HttpsError('invalid-argument', 'imageBase64 required');
    }

    const uid = request.auth.uid;
    const bucket = storage.bucket();
    const path = `users/${uid}/avatar.jpg`;
    const file = bucket.file(path);

    try {
      const buffer = Buffer.from(imageBase64, 'base64');
      await file.save(buffer, {
        metadata: { contentType: 'image/jpeg' },
      });

      const [signed] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      return { photoURL: signed };
    } catch (err) {
      throw new HttpsError('internal', err.message || 'Upload failed');
    }
  }
);

// ---------- Callable: Initiate transfer (Sender sends to Receiver) ----------

export const initiateTransfer = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const sender_uid = request.auth.uid;
    const { receiver_uid, amount_usd, funding_source } = request.data || {};
    if (!receiver_uid || amount_usd == null || amount_usd <= 0) {
      throw new HttpsError('invalid-argument', 'receiver_uid and positive amount_usd required');
    }
    const amount = Number(amount_usd);
    const source = funding_source === 'wallet' ? 'wallet' : 'card'; // card | bank → external

    const { ref: receiverRef, data: receiver } = await getReceiverDoc(receiver_uid);
    const wallet_id = receiver.wallet_id;
    if (!wallet_id) throw new HttpsError('failed-precondition', 'Receiver has no wallet_id');

    if (source === 'wallet') {
      const { ref: senderRef, data: sender } = await getSenderDoc(sender_uid);
      const balance = Number(sender.wallet_balance || 0);
      if (balance < amount) {
        throw new HttpsError('failed-precondition', 'Insufficient wallet balance');
      }
      const ref = `wallet_${sender_uid}_${Date.now()}`;
      await db.runTransaction(async (tx) => {
        tx.update(senderRef, {
          wallet_balance: FieldValue.increment(-amount),
          updated_at: FieldValue.serverTimestamp(),
        });
        tx.update(receiverRef, {
          wallet_balance: FieldValue.increment(amount),
          updated_at: FieldValue.serverTimestamp(),
        });
        tx.set(senderRef.collection('transactions').doc(ref), {
          sender_id: sender_uid,
          receiver_id: receiver_uid,
          amount,
          status: 'completed',
          type: 'outgoing_transfer',
          gateway_ref: ref,
          timestamp: FieldValue.serverTimestamp(),
          metadata: { funding_source: 'wallet' },
        });
        tx.set(receiverRef.collection('transactions').doc(ref), {
          sender_id: sender_uid,
          receiver_id: receiver_uid,
          amount,
          status: 'completed',
          type: 'incoming_transfer',
          gateway_ref: ref,
          timestamp: FieldValue.serverTimestamp(),
          metadata: { funding_source: 'wallet' },
        });
      });
      return { success: true, reference: ref };
    }

    const result = await createTransfer({
      sender_uid,
      receiver_uid,
      receiver_wallet_id: wallet_id,
      amount_usd: amount,
    });

    if (!result.success) {
      throw new HttpsError('internal', result.error || 'Transfer failed');
    }
    return { success: true, reference: result.reference };
  }
);

// ---------- Callable: Withdraw to Mobile Money ----------

export const initiatePayout = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const user_uid = request.auth.uid;
    const { amount_usd, provider } = request.data || {};
    if (amount_usd == null || amount_usd <= 0 || !provider) {
      throw new HttpsError('invalid-argument', 'amount_usd and provider (mpesa|airtel|orange) required');
    }

    const { ref: userRef, data: user } = await getSenderDoc(user_uid);
    const wallet_id = user.wallet_id;
    const balance = Number(user.wallet_balance || 0);
    if (!wallet_id) throw new HttpsError('failed-precondition', 'User has no wallet_id');
    if (balance < amount_usd) throw new HttpsError('failed-precondition', 'Insufficient balance');

    const result = await createPayout({
      user_uid,
      wallet_id,
      amount_usd: Number(amount_usd),
      phone: user.phone,
      provider,
    });

    if (!result.success) {
      throw new HttpsError('internal', result.error || 'Payout failed');
    }

    // Optimistically deduct balance and log withdrawal; webhook can reconcile if needed
    const txRef = userRef.collection('transactions').doc();
    await db.runTransaction(async (tx) => {
      tx.update(userRef, {
        wallet_balance: FieldValue.increment(-amount_usd),
        updated_at: FieldValue.serverTimestamp(),
      });
      tx.set(txRef, {
        sender_id: '',
        receiver_id: user_uid,
        amount: amount_usd,
        status: 'completed',
        type: 'withdrawal',
        gateway_ref: result.reference || result.gateway_ref || '',
        timestamp: FieldValue.serverTimestamp(),
        metadata: { provider },
      });
    });

    return { success: true, reference: result.reference, transaction_id: txRef.id };
  }
);

// ---------- Callable: Save payment method (card or bank), double-encrypted; optional Swiftech vault ----------

export const savePaymentMethod = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const uid = request.auth.uid;
    const { type, card, bank } = request.data || {};
    if (!type || (type !== 'card' && type !== 'bank')) {
      throw new HttpsError('invalid-argument', 'type must be "card" or "bank"');
    }

    const userRef = db.collection('users').doc(uid);
    const updates = { updated_at: FieldValue.serverTimestamp() };

    if (type === 'card') {
      const cardNumber = (card?.card_number || card?.number || '').toString().replace(/\D/g, '');
      const last4 = cardNumber.slice(-4);
      if (last4.length !== 4) {
        throw new HttpsError('invalid-argument', 'Valid card number (at least 4 digits) required');
      }
      const expMonth = parseInt(card?.exp_month, 10);
      const expYear = parseInt(card?.exp_year, 10);
      const fullYear = expYear > 100 ? expYear : 2000 + expYear;
      if (!expMonth || expMonth < 1 || expMonth > 12 || !expYear) {
        throw new HttpsError('invalid-argument', 'Expiry MM/YY required');
      }
      const holderName = (card?.holder_name || card?.card_holder_name || '').trim() || null;
      const payload = { last4, exp_month: expMonth, exp_year: fullYear, holder_name: holderName };

      // Optional: send to Swiftech vault; store only returned token (encrypted)
      const swiftechResult = await savePaymentSource({
        type: 'card',
        user_uid: uid,
        card: { exp_month: expMonth, exp_year: fullYear, holder_name: holderName },
        raw_card_number: cardNumber.length >= 13 ? cardNumber : undefined,
      });
      if (swiftechResult.token) {
        const tokenEnc = encryptPaymentData({ token: swiftechResult.token });
        if (tokenEnc) updates.swiftech_card_token_encrypted = tokenEnc;
      }
      const cardEnc = encryptPaymentData(payload);
      if (cardEnc) updates.card_encrypted = cardEnc;
      updates.card_last4 = last4;
      updates.card_exp_month = expMonth;
      updates.card_exp_year = fullYear;
      updates.card_holder_name = holderName;
    } else {
      const routing = (bank?.routing_number || bank?.routing || '').toString().replace(/\D/g, '').slice(0, 9);
      const accountNumber = (bank?.account_number || bank?.account || '').toString().replace(/\D/g, '');
      const accountLast4 = accountNumber.slice(-4);
      if (routing.length !== 9) {
        throw new HttpsError('invalid-argument', 'Routing number must be 9 digits');
      }
      if (accountLast4.length !== 4) {
        throw new HttpsError('invalid-argument', 'Valid account number (at least 4 digits) required');
      }
      const accountHolder = (bank?.account_holder_name || bank?.account_holder || bank?.holder || '').trim();
      if (!accountHolder) {
        throw new HttpsError('invalid-argument', 'Account holder name required');
      }
      const payload = { routing_number: routing, account_last4: accountLast4, account_holder_name: accountHolder };

      const swiftechResult = await savePaymentSource({
        type: 'bank',
        user_uid: uid,
        bank: { routing_number: routing, account_holder_name: accountHolder },
        raw_account_number: accountNumber.length >= 4 ? accountNumber : undefined,
      });
      if (swiftechResult.token) {
        const tokenEnc = encryptPaymentData({ token: swiftechResult.token });
        if (tokenEnc) updates.swiftech_bank_token_encrypted = tokenEnc;
      }
      const bankEnc = encryptPaymentData(payload);
      if (bankEnc) updates.bank_encrypted = bankEnc;
      updates.bank_account_holder = accountHolder;
      updates.bank_routing = routing;
      updates.bank_account_last4 = accountLast4;
    }

    await userRef.update(updates);
    return { success: true };
  }
);

// ---------- Callable: Get payment methods (decrypted server-side; never full numbers) ----------

export const getPaymentMethods = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) return { card: null, bank: null };
    const data = snap.data();

    let card = null;
    let bank = null;
    try {
      if (data.card_encrypted) {
        card = decryptPaymentData(data.card_encrypted);
      } else if (data.card_last4) {
        card = {
          last4: data.card_last4,
          exp_month: data.card_exp_month,
          exp_year: data.card_exp_year,
          holder_name: data.card_holder_name || null,
        };
      }
    } catch {
      card = null;
    }
    try {
      if (data.bank_encrypted) {
        bank = decryptPaymentData(data.bank_encrypted);
      } else if (data.bank_account_last4) {
        bank = {
          account_holder_name: data.bank_account_holder || null,
          routing_number: data.bank_routing || null,
          account_last4: data.bank_account_last4,
        };
      }
    } catch {
      bank = null;
    }
    return { card, bank };
  }
);

// ---------- Callable: Add money to wallet (from bank / card) ----------
// TODO: Integrate Stripe or payment gateway; for now credits wallet and logs deposit.

export const addMoneyToWallet = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const user_uid = request.auth.uid;
    const { amount_usd, source } = request.data || {};
    if (amount_usd == null || amount_usd <= 0) {
      throw new HttpsError('invalid-argument', 'Positive amount_usd required');
    }
    const amount = Number(amount_usd);
    const fundingSource = ['bank', 'card', 'debit'].includes(source) ? source : 'card';

    const { ref: userRef } = await getSenderDoc(user_uid);
    const ref = `deposit_${user_uid}_${Date.now()}`;
    await db.runTransaction(async (tx) => {
      tx.update(userRef, {
        wallet_balance: FieldValue.increment(amount),
        updated_at: FieldValue.serverTimestamp(),
      });
      tx.set(userRef.collection('transactions').doc(ref), {
        sender_id: '',
        receiver_id: user_uid,
        amount,
        status: 'completed',
        type: 'deposit',
        gateway_ref: ref,
        timestamp: FieldValue.serverTimestamp(),
        metadata: { source: fundingSource },
      });
    });
    return { success: true, reference: ref };
  }
);

// ---------- HTTP: Swiftech webhook (transfer completed → update receiver balance) ----------

export const swiftechWebhook = onRequest(
  { region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const rawBody = typeof req.rawBody === 'undefined' ? JSON.stringify(req.body) : req.rawBody;
    const signature = req.headers['x-swiftech-signature'] || req.headers['x-webhook-signature'] || '';

    if (process.env.SWIFTECH_WEBHOOK_SECRET && !verifyWebhookSignature(rawBody, signature)) {
      res.status(401).send('Invalid signature');
      return;
    }

    const body = typeof req.body === 'object' ? req.body : JSON.parse(rawBody || '{}');
    const event = body.event || body.type || body.status;
    const ref = body.reference || body.gateway_ref || body.transaction_id;
    const amount = Number(body.amount);
    const receiver_uid = body.metadata?.receiver_uid || body.receiver_uid;

    if (event === 'transfer.completed' || body.status === 'completed') {
      if (!receiver_uid || !ref || amount <= 0) {
        res.status(400).json({ error: 'Missing receiver_uid, reference or amount' });
        return;
      }

      const userRef = db.collection('users').doc(receiver_uid);
      const snap = await userRef.get();
      if (!snap.exists) {
        res.status(404).json({ error: 'Receiver not found' });
        return;
      }

      const txRef = userRef.collection('transactions').doc();
      await db.runTransaction(async (tx) => {
        tx.update(userRef, {
          wallet_balance: FieldValue.increment(amount),
          updated_at: FieldValue.serverTimestamp(),
        });
        tx.set(txRef, {
          sender_id: body.sender_id || '',
          receiver_id: receiver_uid,
          amount,
          status: 'completed',
          type: 'incoming_transfer',
          gateway_ref: ref,
          timestamp: FieldValue.serverTimestamp(),
        });
      });

      res.status(200).json({ ok: true, transaction_id: txRef.id });
      return;
    }

    res.status(200).json({ ok: true, ignored: true });
  }
);
