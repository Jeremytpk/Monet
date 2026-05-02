import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

const functions = getFunctions(app, 'us-central1');

/**
 * User: Initiate a kiosk cash-out withdrawal.
 * Generates a 6-digit withdrawal code that the MCP scans at the kiosk.
 * @param {number} amount_usd - Amount to withdraw
 * @param {string} mcp_uid - UID of the MCP partner at the kiosk
 * @returns {Promise} { success, withdrawal_code, fees: { grossAmount, totalFees, mcpCommission, monetCommission, clientNet } }
 */
export async function initiateKioskCashOut(amount_usd, mcp_uid) {
  const fn = httpsCallable(functions, 'initiateKioskCashOut');
  const { data } = await fn({ amount_usd, mcp_uid });
  return data;
}

/**
 * MCP: Confirm kiosk cash-out by scanning the 6-digit code.
 * This deducts from user's wallet, credits MPA, and records the transaction.
 * @param {string} withdrawal_code - 6-digit code scanned at kiosk
 * @returns {Promise} { success, kiosk_tx_id, client_net, mcp_commission, monet_commission }
 */
export async function confirmKioskCashOut(withdrawal_code) {
  const fn = httpsCallable(functions, 'confirmKioskCashOut');
  const { data } = await fn({ withdrawal_code });
  return data;
}
