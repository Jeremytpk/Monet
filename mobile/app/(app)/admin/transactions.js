import { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { collection, query, orderBy, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { useTheme } from '../../../lib/ThemeContext';
import { useAuth } from '../../../lib/useAuth';
import { useLanguage } from '../../../lib/LanguageContext';
import { db } from '../../../lib/firebase';
import { adminCancelTransaction } from '../../../lib/functions';
import { formatMoney } from '../../../lib/format';
import { describeTransaction, formatTxDate } from '../../../lib/transactions';
import { AppText, Button, Card, DetailRow, EmptyState, Header, Screen, Sheet, StatusBadge, TransactionRow } from '../../../components/ui';
import { AdminSearch } from '../../../components/AdminSearch';

const DAY_MS = 24 * 60 * 60 * 1000;
const short = (id) => (id ? `${String(id).slice(0, 8)}…` : '');

export default function AdminTransactions() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { t, lang } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin';

  // Live view: one listener per recent user (avoids a collectionGroup index).
  useEffect(() => {
    if (!isAdmin) return;
    const unsubs = [];
    let cancelled = false;
    (async () => {
      const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('created_at', 'desc'), limit(200)));
      if (cancelled) return;
      const userMap = new Map(usersSnap.docs.map((d) => [d.id, d.data()]));
      const nameOf = (id) => (id ? userMap.get(id)?.name || null : null);
      usersSnap.docs.forEach((uDoc) => {
        const unsub = onSnapshot(query(collection(db, 'users', uDoc.id, 'transactions'), orderBy('timestamp', 'desc')), (snap) => {
          setTransactions((prev) => {
            const next = new Map(prev.map((x) => [x._key, x]));
            snap.docs.forEach((d) => {
              const data = d.data();
              next.set(`${uDoc.id}/${d.id}`, {
                ...data,
                id: d.id,
                owner: uDoc.id,
                _key: `${uDoc.id}/${d.id}`,
                _sender_name: nameOf(data.sender_id),
                _receiver_name: nameOf(data.receiver_id),
                _mcp_name: nameOf(data.metadata?.mcp_uid) || data.metadata?.mcp_name || null,
              });
            });
            return [...next.values()]
              .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
              .slice(0, 300);
          });
        }, (err) => console.warn('transactions sub onSnapshot error', err));
        unsubs.push(unsub);
      });
    })();
    return () => { cancelled = true; unsubs.forEach((u) => u()); };
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx) =>
      [tx._sender_name, tx.sender_id, tx._receiver_name, tx.receiver_id, tx._mcp_name, tx.gateway_ref, tx.id]
        .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [transactions, search]);

  if (!isAdmin) return null;

  function parties(tx) {
    const incoming = tx.type === 'incoming_transfer' || tx.type === 'deposit';
    let from = tx._sender_name || short(tx.sender_id) || t.system;
    let to = tx._receiver_name || short(tx.receiver_id);
    if (tx.type === 'kiosk_withdrawal' && tx._mcp_name) {
      if (incoming) from = tx._mcp_name; else to = tx._mcp_name;
    }
    return to ? `${from} → ${to}` : from;
  }

  function canCancel(tx) {
    const time = tx.timestamp?.toDate?.().getTime() || Date.now();
    return tx.status !== 'cancelled' && Date.now() - time <= DAY_MS;
  }

  function handleCancel(tx) {
    Alert.alert(t.cancel_transaction, t.cancel_transaction_msg, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.cancel_transaction,
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await adminCancelTransaction(tx.owner, tx.id);
            setSelected(null);
            Alert.alert(t.cancelled);
          } catch (err) {
            Alert.alert(t.error, err.message || String(err));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.adminTransactions} subtitle={`${t.total_transactions} ${filtered.length}`} />
      <AdminSearch value={search} onChangeText={setSearch} placeholder={t.search_name_id_ref} />

      <Card padding={0} style={{ overflow: 'hidden' }}>
        {filtered.length ? filtered.map((tx, i) => {
          const d = describeTransaction(tx, t, lang);
          return (
            <View key={tx._key}>
              {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 72 }} /> : null}
              <TransactionRow {...d} title={parties(tx)} subtitle={`${d.title} · ${formatTxDate(tx.timestamp, lang, true)}`} onPress={() => setSelected(tx)} />
            </View>
          );
        }) : (
          <EmptyState icon="receipt" title={t.noTransactions} />
        )}
      </Card>

      <Sheet visible={!!selected} onClose={() => setSelected(null)} title={t.transactionDetails}>
        {selected ? (
          <>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <AppText variant="amount">{formatMoney(Number(selected.amount || 0))}</AppText>
              {selected.status ? <StatusBadge status={selected.status} label={t[selected.status]} /> : null}
              <AppText variant="body" color="muted" style={{ textAlign: 'center' }}>{parties(selected)}</AppText>
            </View>
            <View style={{ gap: 8 }}>
              <DetailRow label={t.txType} value={describeTransaction(selected, t, lang).title} />
              <DetailRow label={t.txDate} value={formatTxDate(selected.timestamp, lang, true)} />
              <DetailRow label={t.reference} value={String(selected.gateway_ref || selected.id).slice(0, 24)} />
              {selected.metadata?.fees != null ? <DetailRow label={t.txFees} value={formatMoney(Number(selected.metadata.fees))} /> : null}
            </View>
            {canCancel(selected) ? (
              <Button variant="secondary" title={t.cancel_transaction} onPress={() => handleCancel(selected)} loading={cancelling} style={{ borderColor: colors.error }} />
            ) : (
              <AppText variant="caption" color="muted" style={{ textAlign: 'center' }}>{t.cancelWindowNote}</AppText>
            )}
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
