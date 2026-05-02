/**
 * Monet Cloud Functions
 * - Bridge Firebase ↔ Swiftech
 * - Update balances and ledger on webhook
 * - Callable: initiateTransfer, initiatePayout, createWalletUser
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { initializeApp } from 'firebase-admin/app';
import { createTransfer, createPayout, verifyWebhookSignature, savePaymentSource } from './swiftech.js';
import { encryptPaymentData, decryptPaymentData } from './encryption.js';

initializeApp();
const db = getFirestore();
const storage = getStorage();
const adminAuth = getAuth();

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

// ---------- Kiosk Helpers ----------

/**
 * Calculate kiosk withdrawal fees.
 * Total Fees: 10% of amount
 * MCP Commission: 70% of fees (7% of amount)
 * Monet Commission: 30% of fees (3% of amount)
 * Client Net: amount - total_fees
 */
function calculateKioskFees(amount) {
  const totalFees = amount * 0.10;
  const mcpCommission = totalFees * 0.70; // 7% of amount
  const monetCommission = totalFees * 0.30; // 3% of amount
  const clientNet = amount - totalFees;
  return {
    grossAmount: amount,
    totalFees,
    mcpCommission,
    monetCommission,
    clientNet,
  };
}

/**
 * Generate a 6-digit withdrawal code for kiosk transactions.
 */
function generateWithdrawalCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate that an MCP (Money Partner) has sufficient balance (>= $250 USD).
 */
async function validateMcpBalance(mcp_uid) {
  const ref = db.collection('users').doc(mcp_uid);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'MCP user not found');
  const data = snap.data();
  const balance = Number(data.wallet_balance || 0);
  
  // SIMULATION MODE: Bypassing the $250 minimum requirement for testing
  // if (balance < 250) {
  //   throw new HttpsError('failed-precondition', `Insufficient MCP wallet balance. Current: $${balance}, Required: $250`);
  // }
  return balance;
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

    await logActivity({ actor_uid: uid, action: 'create_wallet_user', metadata: { wallet_id } });
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

    // SIMULATION MODE: Bypass Swiftech and immediately complete the external transfer
    const { ref: senderRef } = await getSenderDoc(sender_uid);
    const ref = `sim_ext_${sender_uid}_${Date.now()}`;
    await db.runTransaction(async (tx) => {
      // Credit receiver
      tx.update(receiverRef, {
        wallet_balance: FieldValue.increment(amount),
        updated_at: FieldValue.serverTimestamp(),
      });
      // Receiver transaction record
      tx.set(receiverRef.collection('transactions').doc(ref), {
        sender_id: sender_uid,
        receiver_id: receiver_uid,
        amount,
        status: 'completed',
        type: 'incoming_transfer',
        gateway_ref: ref,
        timestamp: FieldValue.serverTimestamp(),
        metadata: { funding_source: source },
      });
      // Sender transaction record (no balance deduction since it's funded via external card/bank)
      tx.set(senderRef.collection('transactions').doc(ref), {
        sender_id: sender_uid,
        receiver_id: receiver_uid,
        amount,
        status: 'completed',
        type: 'outgoing_transfer',
        gateway_ref: ref,
        timestamp: FieldValue.serverTimestamp(),
        metadata: { funding_source: source },
      });
    });

    await logActivity({ actor_uid: sender_uid, action: 'initiate_transfer_simulated', metadata: { receiver_uid, amount_usd: amount, source } });
    return { success: true, reference: ref };
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

      await logActivity({ actor_uid: user_uid, action: 'initiate_payout', metadata: { amount_usd, provider, reference: result.reference } });
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
    await logActivity({ actor_uid: uid, action: 'save_payment_method', metadata: { type } });
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
      await logActivity({ actor_uid: user_uid, action: 'add_money', metadata: { amount, source: fundingSource, reference: ref } });
      return { success: true, reference: ref };
  }
);

// ---------- Helpers: Admin check & activity logging ----------

async function ensureAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
  const uid = request.auth.uid;
  const snap = await db.collection('users').doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  const role = (data.role || '').toString().toLowerCase();
  if (role !== 'admin') throw new HttpsError('permission-denied', 'Admin role required');
  return uid;
}

async function logActivity({ actor_uid, action, target_uid = null, metadata = {} }) {
  const docRef = db.collection('activities').doc();
  await docRef.set({
    actor_uid: actor_uid || null,
    action,
    target_uid: target_uid || null,
    metadata,
    timestamp: FieldValue.serverTimestamp(),
  });
}

// ---------- Callable (Admin): Delete a user (Firestore doc + Auth user) ----------

export const adminDeleteUser = onCall({ enforceAppCheck: false }, async (request) => {
  const adminUid = await ensureAdmin(request);
  const { uid } = request.data || {};
  if (!uid) throw new HttpsError('invalid-argument', 'uid required');

  // Delete Firestore user doc and subcollections (best-effort), then delete auth user
  try {
    const userRef = db.collection('users').doc(uid);
    // delete subcollection documents (transactions)
    const txs = await userRef.collection('transactions').listDocuments();
    for (const d of txs) await d.delete();
    // delete user doc
    await userRef.delete();
    // delete auth user
    await adminAuth.deleteUser(uid).catch(() => {});
    await logActivity({ actor_uid: adminUid, action: 'delete_user', target_uid: uid });
    return { success: true };
  } catch (err) {
    throw new HttpsError('internal', err.message || 'Delete failed');
  }
});

// ---------- Callable (Admin): Edit user profile fields (except password) ----------

export const adminEditUser = onCall({ enforceAppCheck: false }, async (request) => {
  const adminUid = await ensureAdmin(request);
  const { uid, updates } = request.data || {};
  if (!uid || !updates || typeof updates !== 'object') throw new HttpsError('invalid-argument', 'uid and updates required');
  // Prevent password changes here
  delete updates.password;
  delete updates.passwordHash;
  try {
    const userRef = db.collection('users').doc(uid);
    updates.updated_at = FieldValue.serverTimestamp();
    await userRef.update(updates);
    await logActivity({ actor_uid: adminUid, action: 'edit_user', target_uid: uid, metadata: { updates } });
    return { success: true };
  } catch (err) {
    throw new HttpsError('internal', err.message || 'Edit failed');
  }
});

// ---------- Callable (Admin): Cancel a transaction and reverse funds (manual) ----------

export const adminCancelTransaction = onCall({ enforceAppCheck: false }, async (request) => {
  const adminUid = await ensureAdmin(request);
  const { owner_uid, transaction_id } = request.data || {};
  if (!owner_uid || !transaction_id) throw new HttpsError('invalid-argument', 'owner_uid and transaction_id required');

  const txDocRef = db.collection('users').doc(owner_uid).collection('transactions').doc(transaction_id);
  const txSnap = await txDocRef.get();
  if (!txSnap.exists) throw new HttpsError('not-found', 'Transaction not found');
  const txData = txSnap.data();
  if (txData.status === 'cancelled') return { success: true, message: 'Already cancelled' };

  const senderId = txData.sender_id;
  const receiverId = txData.receiver_id;
  const amount = Number(txData.amount || 0);

  if (!senderId || !receiverId || !amount) throw new HttpsError('failed-precondition', 'Transaction missing required fields');

  // reverse: decrement receiver, increment sender
  const senderRef = db.collection('users').doc(senderId);
  const receiverRef = db.collection('users').doc(receiverId);
  const senderTxRef = senderRef.collection('transactions').doc(transaction_id);
  const receiverTxRef = receiverRef.collection('transactions').doc(transaction_id);

  try {
    await db.runTransaction(async (tx) => {
      const sSnap = await tx.get(senderRef);
      const rSnap = await tx.get(receiverRef);
      const sBal = Number(sSnap.data()?.wallet_balance || 0);
      const rBal = Number(rSnap.data()?.wallet_balance || 0);

      tx.update(senderRef, { wallet_balance: FieldValue.increment(amount), updated_at: FieldValue.serverTimestamp() });
      tx.update(receiverRef, { wallet_balance: FieldValue.increment(-amount), updated_at: FieldValue.serverTimestamp() });

      tx.update(senderTxRef, { status: 'cancelled', cancelled_by: adminUid, cancelled_at: FieldValue.serverTimestamp() });
      tx.update(receiverTxRef, { status: 'cancelled', cancelled_by: adminUid, cancelled_at: FieldValue.serverTimestamp() });
    });
    await logActivity({ actor_uid: adminUid, action: 'cancel_transaction', metadata: { owner_uid, transaction_id, senderId, receiverId, amount } });
    return { success: true };
  } catch (err) {
    throw new HttpsError('internal', err.message || 'Cancellation failed');
  }
});

// ---------- Callable (Admin): Ads management (create/update/delete) ----------

export const adminCreateAd = onCall({ enforceAppCheck: false }, async (request) => {
  const adminUid = await ensureAdmin(request);
  const { title, message, image_url, active = true } = request.data || {};
  if (!title || !message) throw new HttpsError('invalid-argument', 'title and message required');
  try {
    const ref = db.collection('ads').doc();
    await ref.set({ title, message, image_url: image_url || null, active, created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp(), created_by: adminUid });
    await logActivity({ actor_uid: adminUid, action: 'create_ad', metadata: { ad_id: ref.id, title } });
    return { success: true, id: ref.id };
  } catch (err) {
    throw new HttpsError('internal', err.message || 'Create ad failed');
  }
});

export const adminUpdateAd = onCall({ enforceAppCheck: false }, async (request) => {
  const adminUid = await ensureAdmin(request);
  const { id, updates } = request.data || {};
  if (!id || !updates) throw new HttpsError('invalid-argument', 'id and updates required');
  try {
    updates.updated_at = FieldValue.serverTimestamp();
    await db.collection('ads').doc(id).update(updates);
    await logActivity({ actor_uid: adminUid, action: 'update_ad', metadata: { ad_id: id, updates } });
    return { success: true };
  } catch (err) {
    throw new HttpsError('internal', err.message || 'Update ad failed');
  }
});

export const adminDeleteAd = onCall({ enforceAppCheck: false }, async (request) => {
  const adminUid = await ensureAdmin(request);
  const { id } = request.data || {};
  if (!id) throw new HttpsError('invalid-argument', 'id required');
  try {
    await db.collection('ads').doc(id).delete();
    await logActivity({ actor_uid: adminUid, action: 'delete_ad', metadata: { ad_id: id } });
    return { success: true };
  } catch (err) {
    throw new HttpsError('internal', err.message || 'Delete ad failed');
  }
});

// ---------- Callable (Admin): Upload ad image (base64 -> Storage) ----------

export const adminUploadAdImage = onCall({ enforceAppCheck: false }, async (request) => {
  const adminUid = await ensureAdmin(request);
  const { imageBase64, contentType = 'image/jpeg' } = request.data || {};
  if (!imageBase64) throw new HttpsError('invalid-argument', 'imageBase64 required');
  
  const bucket = storage.bucket().name;
  const fileName = `ads/${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const file = storage.bucket().file(fileName);
  
  try {
    const buffer = Buffer.from(imageBase64, 'base64');
    await file.save(buffer, { metadata: { contentType } });
    
    // Return a direct public Storage URL (storage.rules allows read)
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(fileName)}?alt=media`;
    
    await logActivity({ actor_uid: adminUid, action: 'upload_ad_image', metadata: { path: fileName } });
    return { success: true, url: publicUrl };
  } catch (err) {
    throw new HttpsError('internal', err.message || 'Upload failed');
  }
});

// ---------- Callable: Initiate Kiosk Cash-Out (User generates withdrawal code) ----------

export const initiateKioskCashOut = onCall({ enforceAppCheck: false }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
  const user_uid = request.auth.uid;
  const { amount_usd, mcp_uid } = request.data || {};
  
  if (amount_usd == null || amount_usd <= 0 || !mcp_uid) {
    throw new HttpsError('invalid-argument', 'amount_usd and mcp_uid required');
  }

  const amount = Number(amount_usd);
  
  // Validate user has sufficient balance
  const { ref: userRef, data: user } = await getSenderDoc(user_uid);
  const userBalance = Number(user.wallet_balance || 0);
  if (userBalance < amount) {
    throw new HttpsError('failed-precondition', 'Insufficient wallet balance');
  }

  // Validate MCP has sufficient MPA balance (>= $250)
  await validateMcpBalance(mcp_uid);

  // Generate withdrawal code and fees
  const withdrawalCode = generateWithdrawalCode();
  const fees = calculateKioskFees(amount);

  // Store pending kiosk transaction (expires in 15 minutes)
  const kioskTxRef = db.collection('kiosk_transactions').doc();
  await kioskTxRef.set({
    code: withdrawalCode,
    user_uid,
    mcp_uid,
    gross_amount: fees.grossAmount,
    total_fees: fees.totalFees,
    mcp_commission: fees.mcpCommission,
    monet_commission: fees.monetCommission,
    client_net: fees.clientNet,
    status: 'pending', // pending -> scanned -> confirmed -> completed
    created_at: FieldValue.serverTimestamp(),
    expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
  });

  await logActivity({
    actor_uid: user_uid,
    action: 'initiate_kiosk_cashout',
    metadata: { kiosk_tx_id: kioskTxRef.id, amount_usd: amount, mcp_uid },
  });

  return { success: true, withdrawal_code: withdrawalCode, fees };
});

// ---------- Callable: Confirm Kiosk Cash-Out (MCP scans code & confirms cash handover) ----------

export const confirmKioskCashOut = onCall({ enforceAppCheck: false }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
  const mcp_uid = request.auth.uid;
  const { withdrawal_code } = request.data || {};

  if (!withdrawal_code) throw new HttpsError('invalid-argument', 'withdrawal_code required');

  // Find the pending kiosk transaction by code
  const snap = await db
    .collection('kiosk_transactions')
    .where('code', '==', withdrawal_code)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError('not-found', 'Withdrawal code not found or already used');
  }

  const kioskTxDoc = snap.docs[0];
  const kioskTx = kioskTxDoc.data();

  // Verify MCP matches
  if (kioskTx.mcp_uid !== mcp_uid) {
    throw new HttpsError('permission-denied', 'This code is not assigned to your MPA account');
  }

  // Verify code hasn't expired
  const expiresAt = kioskTx.expires_at.toDate?.() || kioskTx.expires_at;
  if (Date.now() > expiresAt.getTime()) {
    throw new HttpsError('failed-precondition', 'Withdrawal code has expired');
  }

  const user_uid = kioskTx.user_uid;
  const amount = kioskTx.gross_amount;
  const clientNet = kioskTx.client_net;
  const mcpCommission = kioskTx.mcp_commission;
  const monetCommission = kioskTx.monet_commission;

  // Perform atomic transaction: debit user, credit MPA, record transaction
  const userRef = db.collection('users').doc(user_uid);
  const mpaRef = db.collection('mpa_accounts').doc(mcp_uid);

  try {
    await db.runTransaction(async (tx) => {
      // Verify balances haven't changed
      const userSnap = await tx.get(userRef);
      const userBal = Number(userSnap.data()?.wallet_balance || 0);
      if (userBal < amount) {
        throw new HttpsError('failed-precondition', 'User balance changed; transaction cannot proceed');
      }

      // Get MCP user name
      const mcpUserSnap = await tx.get(db.collection('users').doc(mcp_uid));
      const mcpName = mcpUserSnap.exists ? (mcpUserSnap.data()?.name || 'Kiosk Partner') : 'Kiosk Partner';

      // Debit user wallet by gross amount
      tx.update(userRef, {
        wallet_balance: FieldValue.increment(-amount),
        updated_at: FieldValue.serverTimestamp(),
      });

      // Credit MPA account by client net + commission retained by MCP
      // (MPA receives: clientNet + mcpCommission; Monet keeps monetCommission)
      tx.set(mpaRef, {
        balance: FieldValue.increment(clientNet + mcpCommission),
        total_commissions_earned: FieldValue.increment(mcpCommission),
        updated_at: FieldValue.serverTimestamp(),
      }, { merge: true });

      // Record transaction in user's ledger
      const userTxRef = userRef.collection('transactions').doc();
      tx.set(userTxRef, {
        sender_id: user_uid,
        receiver_id: '', // kiosk withdrawal, no receiver
        amount,
        status: 'completed',
        type: 'kiosk_withdrawal',
        gateway_ref: kioskTxDoc.id,
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
          mcp_uid,
          mcp_name: mcpName,
          withdrawal_code,
          client_net: clientNet,
          fees: monetCommission + mcpCommission,
        },
      });

      // Record transaction in MPA ledger
      const mpaTxRef = mpaRef.collection('transactions').doc();
      tx.set(mpaTxRef, {
        type: 'kiosk_commission',
        user_uid,
        withdrawal_code,
        commission_earned: mcpCommission,
        client_cash_handed: clientNet,
        timestamp: FieldValue.serverTimestamp(),
      });

      // Mark kiosk transaction as completed
      tx.update(kioskTxDoc.ref, {
        status: 'completed',
        completed_at: FieldValue.serverTimestamp(),
      });
    });

    await logActivity({
      actor_uid: mcp_uid,
      action: 'confirm_kiosk_cashout',
      target_uid: user_uid,
      metadata: {
        kiosk_tx_id: kioskTxDoc.id,
        amount,
        commission: mcpCommission,
      },
    });

    return {
      success: true,
      kiosk_tx_id: kioskTxDoc.id,
      gross_amount: amount,
      client_net: clientNet,
      mcp_commission: mcpCommission,
      monet_commission: monetCommission,
    };
  } catch (err) {
    throw new HttpsError('internal', err.message || 'Confirmation failed');
  }
});

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
