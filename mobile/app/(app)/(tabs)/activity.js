import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { collection, query, orderBy, limit, getDocs, onSnapshot, where } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '../../../lib/firebase';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';
import { formatMoney } from '../../../lib/format';
import { describeTransaction, formatTxDate } from '../../../lib/transactions';
import {
  AppText,
  Button,
  Card,
  CodeDisplay,
  DetailRow,
  EmptyState,
  Icon,
  IconChip,
  Screen,
  Segmented,
  Sheet,
  StatusBadge,
  TextField,
  TransactionRow,
} from '../../../components/ui';
import { GuestPrompt } from '../../../components/GuestPrompt';
import { Character } from '../../../components/brand';

export default function ActivityScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [pendingKiosk, setPendingKiosk] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [authAction, setAuthAction] = useState(null); // 'pending' | 'details'

  const load = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const q = query(collection(db, 'users', user.uid, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn(e);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    load().finally(() => setLoading(false));
  }, [user?.uid, load]);

  // Real-time listener for any pending (unexpired) kiosk withdrawal code.
  useEffect(() => {
    if (!user?.uid) return;
    const qPending = query(collection(db, 'kiosk_transactions'), where('user_uid', '==', user.uid), where('status', '==', 'pending'));
    const unsub = onSnapshot(qPending, (snap) => {
      const valid = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .find((d) => (d.expires_at?.toDate?.() || new Date(0)).getTime() > Date.now());
      setPendingKiosk(valid || null);
      if (!valid) setCodeVisible(false);
    });
    return () => unsub();
  }, [user?.uid]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function askPassword(action, tx = null) {
    setAuthAction(action);
    setSelectedTx(tx);
    setPasswordError(null);
    setPasswordVisible(true);
  }

  function closePassword() {
    setPasswordVisible(false);
    setPasswordInput('');
    setPasswordError(null);
    setAuthAction(null);
  }

  async function handleVerifyPassword() {
    if (!passwordInput) return;
    setVerifying(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, passwordInput);
      await reauthenticateWithCredential(auth.currentUser, credential);
      const action = authAction;
      closePassword();
      if (action === 'pending') setCodeVisible(true);
      else if (action === 'details') setDetailsVisible(true);
    } catch (e) {
      setPasswordError(t.errWrongPassword);
    } finally {
      setVerifying(false);
    }
  }

  function getTxTypeLabel(type) {
    switch (type) {
      case 'incoming_transfer': return t.txTypeIncoming;
      case 'outgoing_transfer': return t.txTypeOutgoing;
      case 'deposit': return t.deposit;
      case 'withdrawal': return t.withdrawal;
      case 'kiosk_withdrawal': return t.txTypeKioskWithdrawal;
      default: return String(type || '').replace(/_/g, ' ');
    }
  }

  if (!user) {
    return (
      <Screen>
        <AppText variant="title" accessibilityRole="header">{t.tabActivity}</AppText>
        <GuestPrompt tone="mint" art={<Character name="mama" size={170} />} title={t.guestActivityTitle} message={t.guestActivityMsg} />
      </Screen>
    );
  }

  const items = transactions
    .map((tx) => ({ tx, d: describeTransaction(tx, t, lang) }))
    .filter(({ d }) => filter === 'all' || d.direction === filter);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View style={{ gap: 4 }}>
        <AppText variant="title" accessibilityRole="header">{t.tabActivity}</AppText>
        <AppText variant="body" color="muted">{t.moneyInOut}</AppText>
      </View>

      {pendingKiosk ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.pendingKioskWithdrawal}. ${t.tapToViewCode}`}
          onPress={() => askPassword('pending')}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20,
            backgroundColor: pressed ? colors.highlightSoft : colors.card, borderWidth: 1.5, borderColor: colors.highlight,
          })}
        >
          <IconChip icon="kiosk" tone="highlight" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyStrong" style={{ fontSize: 15 }}>{t.pendingKioskWithdrawal}</AppText>
            <AppText variant="caption" color="muted">
              {formatMoney(Number(pendingKiosk.client_net || 0))} · {t.tapToViewCode}
            </AppText>
          </View>
          <Icon name="lock" size={20} color="highlightText" />
        </Pressable>
      ) : null}

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t.all },
          { value: 'in', label: t.filterIn },
          { value: 'out', label: t.filterOut },
        ]}
      />

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <Card padding={0} style={{ overflow: 'hidden' }}>
          {items.length ? items.map(({ tx, d }, i) => (
            <View key={tx.id}>
              {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 72 }} /> : null}
              <TransactionRow {...d} onPress={() => askPassword('details', tx)} />
            </View>
          )) : (
            <EmptyState art={<Character name="mama" size={130} />} title={t.activityEmptyTitle} message={t.activityEmptyMsg} />
          )}
        </Card>
      )}

      <Sheet visible={passwordVisible} onClose={closePassword} title={t.enterPasswordToView}>
        <AppText variant="body" color="muted">{t.passwordProtectHint}</AppText>
        <TextField
          label={t.password}
          secureTextEntry
          autoFocus
          autoCapitalize="none"
          value={passwordInput}
          onChangeText={(v) => { setPasswordInput(v); setPasswordError(null); }}
          onSubmitEditing={handleVerifyPassword}
          error={passwordError}
        />
        <Button title={t.verify} onPress={handleVerifyPassword} loading={verifying} disabled={!passwordInput} />
      </Sheet>

      <Sheet visible={codeVisible} onClose={() => setCodeVisible(false)} title={t.activeWithdrawalCode}>
        <View style={{ alignItems: 'center' }}><Character name="kiosk" size={120} /></View>
        <AppText variant="body" color="muted">{t.showCodeToAgent}</AppText>
        <CodeDisplay code={pendingKiosk?.code} />
        {pendingKiosk ? (
          <View style={{ gap: 8 }}>
            <DetailRow label={t.cashToReceive} value={formatMoney(Number(pendingKiosk.client_net || 0))} strong />
            <DetailRow label={t.codeExpires} value={formatTxDate(pendingKiosk.expires_at, lang, true)} />
          </View>
        ) : null}
        <Button title={t.ok} onPress={() => setCodeVisible(false)} />
      </Sheet>

      <Sheet visible={detailsVisible} onClose={() => setDetailsVisible(false)} title={t.transactionDetails}>
        {selectedTx ? (
          <View style={{ gap: 12 }}>
            <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
              <AppText variant="amount">{formatMoney(Number(selectedTx.amount || 0))}</AppText>
              {selectedTx.status ? <StatusBadge status={selectedTx.status} label={t[selectedTx.status?.toLowerCase()]} /> : null}
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <DetailRow label={t.txType} value={getTxTypeLabel(selectedTx.type)} />
            <DetailRow label={t.txDate} value={formatTxDate(selectedTx.timestamp, lang, true)} />
            {selectedTx.metadata?.fees != null ? <DetailRow label={t.txFees} value={formatMoney(Number(selectedTx.metadata.fees))} /> : null}
            {selectedTx.metadata?.client_net != null ? <DetailRow label={t.cashToReceive} value={formatMoney(Number(selectedTx.metadata.client_net))} /> : null}
            {selectedTx.metadata?.mcp_name ? <DetailRow label={t.mcpName} value={selectedTx.metadata.mcp_name} strong /> : null}
            {selectedTx.gateway_ref ? <DetailRow label={t.reference} value={String(selectedTx.gateway_ref).slice(0, 18)} /> : null}
            {selectedTx.metadata?.withdrawal_code ? <CodeDisplay code={selectedTx.metadata.withdrawal_code} label={t.txCode} /> : null}
          </View>
        ) : null}
        <Button title={t.ok} onPress={() => setDetailsVisible(false)} />
      </Sheet>
    </Screen>
  );
}
