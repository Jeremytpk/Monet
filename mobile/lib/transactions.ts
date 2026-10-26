import type { IconName } from '../components/ui/Icon';
import type { TransactionStatus } from '../components/ui/StatusBadge';

type Translations = Record<string, string>;

export type Transaction = {
  id: string;
  type?: string;
  amount?: number;
  status?: string;
  timestamp?: { toDate?: () => Date };
  metadata?: Record<string, any>;
};

const PROVIDERS: Record<string, string> = { mpesa: 'M-Pesa', airtel: 'Airtel Money', orange: 'Orange Money' };

export function formatTxDate(ts: Transaction['timestamp'], lang: string, withTime = false) {
  const d = ts?.toDate?.();
  if (!d) return '—';
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    ...(withTime ? { year: 'numeric', hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** How a ledger entry is shown in lists: title, subtitle, icon and money direction. */
export function describeTransaction(tx: Transaction, t: Translations, lang: string) {
  const date = formatTxDate(tx.timestamp, lang);
  const m = tx.metadata || {};
  let title: string;
  let detail: string | undefined;
  let icon: IconName;
  let direction: 'in' | 'out' = 'out';

  switch (tx.type) {
    case 'incoming_transfer':
      title = t.txReceived;
      icon = 'arrow-down-left';
      direction = 'in';
      break;
    case 'deposit':
      title = t.txAddedMoney;
      detail = m.source === 'bank' ? t.bankAccount : t.debitOrCreditCard?.replace('\n', ' ');
      icon = 'plus';
      direction = 'in';
      break;
    case 'outgoing_transfer':
      title = t.txSent;
      detail = m.funding_source === 'wallet' ? t.walletBalance : undefined;
      icon = 'arrow-up-right';
      break;
    case 'withdrawal':
      title = t.txMobileMoney;
      detail = PROVIDERS[m.provider] || undefined;
      icon = 'phone';
      break;
    case 'kiosk_withdrawal':
      title = t.txKioskCashOut;
      detail = m.mcp_name;
      icon = 'kiosk';
      break;
    default:
      title = String(tx.type || t.transfer).replace(/_/g, ' ');
      icon = 'swap';
  }

  const status = (['completed', 'pending', 'failed', 'cancelled'].includes(String(tx.status)) ? tx.status : undefined) as
    | TransactionStatus
    | undefined;

  return {
    title,
    subtitle: [date, detail].filter(Boolean).join(' · '),
    icon,
    direction,
    amount: Number(tx.amount || 0),
    status,
    statusLabel: status ? t[status] : undefined,
  };
}
