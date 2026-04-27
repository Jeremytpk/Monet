/**
 * Swiftech API client for Monet.
 * - /v1/transfer: move money from US to DRC (inbound to wallet)
 * - /v1/payout: cash out from Monet pool to Mobile Money (M-Pesa, Airtel, Orange)
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

const BASE_URL = process.env.SWIFTECH_BASE_URL || 'https://api.swiftech.com';
const API_KEY = process.env.SWIFTECH_API_KEY;
const SECRET = process.env.SWIFTECH_SECRET;

function getAuthHeader() {
  if (!API_KEY || !SECRET) {
    throw new Error('Swiftech API credentials not configured (SWIFTECH_API_KEY, SWIFTECH_SECRET)');
  }
  const encoded = Buffer.from(`${API_KEY}:${SECRET}`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Initiate transfer from sender (US) to receiver wallet in DRC.
 * @param {Object} params
 * @param {string} params.sender_uid - Firebase UID of sender
 * @param {string} params.receiver_uid - Firebase UID of receiver
 * @param {string} params.receiver_wallet_id - Monet wallet_id for receiver
 * @param {number} params.amount_usd - Amount in USD
 * @param {string} [params.reference] - Optional client reference
 * @returns {Promise<{ success: boolean, reference?: string, error?: string }>}
 */
export async function createTransfer({ sender_uid, receiver_uid, receiver_wallet_id, amount_usd, reference }) {
  const url = `${BASE_URL.replace(/\/$/, '')}/v1/transfer`;
  const body = {
    sender_id: sender_uid,
    receiver_wallet_id,
    amount: amount_usd,
    currency: 'USD',
    reference: reference || `monet_${sender_uid}_${Date.now()}`,
    metadata: { receiver_uid },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, error: data.message || data.error || res.statusText };
  }
  return {
    success: true,
    reference: data.reference || data.id || data.transaction_id,
    gateway_ref: data.gateway_ref || data.reference,
  };
}

/**
 * Payout from Monet pool to recipient's mobile money (M-Pesa, Airtel Money, Orange Money).
 * @param {Object} params
 * @param {string} params.user_uid - Firebase UID
 * @param {string} params.wallet_id - Monet wallet_id
 * @param {number} params.amount_usd - Amount in USD
 * @param {string} params.phone - E.164 mobile number
 * @param {string} params.provider - 'mpesa' | 'airtel' | 'orange'
 * @returns {Promise<{ success: boolean, reference?: string, error?: string }>}
 */
export async function createPayout({ user_uid, wallet_id, amount_usd, phone, provider }) {
  const url = `${BASE_URL.replace(/\/$/, '')}/v1/payout`;
  const body = {
    wallet_id,
    amount: amount_usd,
    currency: 'USD',
    recipient_phone: phone,
    provider: provider.toLowerCase().replace(/\s/g, '_'),
    reference: `monet_payout_${user_uid}_${Date.now()}`,
    metadata: { user_uid },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, error: data.message || data.error || res.statusText };
  }
  return {
    success: true,
    reference: data.reference || data.id || data.payout_id,
    gateway_ref: data.gateway_ref || data.reference,
  };
}

/**
 * Verify webhook signature (if Swiftech sends one).
 * @param {string} payload - Raw body string
 * @param {string} signature - Header value (e.g. X-Swiftech-Signature)
 * @returns {boolean}
 */
export function verifyWebhookSignature(payload, signature) {
  const secret = process.env.SWIFTECH_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return signature === expected || signature === `sha256=${expected}`;
}

/**
 * Save payment method with Swiftech vault (if available).
 * If Swiftech provides a payment-method / source / vault API, set
 * SWIFTECH_VAULT_URL (e.g. https://api.swiftech.com/v1/payment-methods) and
 * optionally SWIFTECH_VAULT_METHOD (POST). The backend will send minimal
 * payload and store the returned token; full card/account numbers never touch our DB.
 * @param {Object} params
 * @param {string} params.type - 'card' | 'bank'
 * @param {string} [params.user_uid] - Firebase UID
 * @param {object} [params.card] - { number_last4, exp_month, exp_year, holder_name } (never full number)
 * @param {object} [params.bank] - { routing_number, account_last4, account_holder_name }
 * @param {string} [params.raw_card_number] - Full card number ONLY if sending to Swiftech then discarding (never stored)
 * @param {string} [params.raw_account_number] - Full account number ONLY if sending to Swiftech then discarding
 * @returns {Promise<{ token: string | null, error?: string }>}
 */
export async function savePaymentSource({ type, user_uid, card, bank, raw_card_number, raw_account_number }) {
  const vaultUrl = process.env.SWIFTECH_VAULT_URL || process.env.SWIFTECH_PAYMENT_METHODS_URL;
  if (!vaultUrl) {
    return { token: null };
  }
  try {
    const body = type === 'card'
      ? {
          type: 'card',
          customer_id: user_uid,
          ...(raw_card_number && { number: raw_card_number.replace(/\D/g, '') }),
          exp_month: card?.exp_month,
          exp_year: card?.exp_year,
          holder_name: card?.holder_name,
        }
      : {
          type: 'bank_account',
          customer_id: user_uid,
          ...(raw_account_number && { account_number: raw_account_number.replace(/\D/g, '') }),
          routing_number: bank?.routing_number,
          account_holder_name: bank?.account_holder_name,
        };

    const res = await fetch(vaultUrl, {
      method: (process.env.SWIFTECH_VAULT_METHOD || 'POST').toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { token: null, error: data.message || data.error || res.statusText };
    }
    const token = data.token || data.id || data.payment_method_id || data.source_id;
    return { token: token || null };
  } catch (err) {
    return { token: null, error: err.message };
  }
}
