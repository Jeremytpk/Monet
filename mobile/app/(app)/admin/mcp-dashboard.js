import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useTheme } from '../../../lib/ThemeContext';
import { useAuth } from '../../../lib/useAuth';
import { useLanguage } from '../../../lib/LanguageContext';
import { db } from '../../../lib/firebase';
import { confirmKioskCashOut } from '../../../lib/kiosk';
import { formatMoney } from '../../../lib/format';
import { formatTxDate } from '../../../lib/transactions';
import {
  AppText,
  Avatar,
  Button,
  Card,
  DetailRow,
  EmptyState,
  Icon,
  IconChip,
  Logo,
  Screen,
  Sheet,
  StatusBadge,
  TransactionRow,
} from '../../../components/ui';
import { Character, Sticker } from '../../../components/brand';

export default function McpDashboard() {
  const { colors, radii, isDark } = useTheme();
  const { profile, user } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();

  const [mpaAccount, setMpaAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawalCode, setWithdrawalCode] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [codeError, setCodeError] = useState(null);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [lastConfirmation, setLastConfirmation] = useState(null);
  const uid = user?.uid || '';

  // Live MPA balance and history (keyed on uid so listeners aren't recreated every render).
  useEffect(() => {
    if (!uid) return;
    const unsubAccount = onSnapshot(doc(db, 'mpa_accounts', uid), (snap) => setMpaAccount(snap.exists() ? snap.data() : null),
      (err) => console.error('Error loading MPA account:', err));
    const unsubTx = onSnapshot(query(collection(db, 'mpa_accounts', uid, 'transactions'), orderBy('timestamp', 'desc')),
      (snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubAccount(); unsubTx(); };
  }, [uid]);

  async function handleConfirm() {
    if (withdrawalCode.length !== 6) {
      setCodeError(t.errCodeRequiredMsg);
      return;
    }
    setConfirmLoading(true);
    try {
      const result = await confirmKioskCashOut(withdrawalCode);
      if (result.success) {
        setLastConfirmation(result);
        setWithdrawalCode('');
        setShowCodeEntry(false);
      }
    } catch (err) {
      setCodeError(err.message || t.errConfirmFailed);
    } finally {
      setConfirmLoading(false);
    }
  }

  const isMcp = profile && String(profile.role || '').toLowerCase() === 'mcp';
  if (!profile || !isMcp) return null;

  // SIMULATION: the $250 minimum is bypassed server-side, so agents are always active.
  const isMcpActive = true;
  const onBrand = isDark ? colors.background : colors.accentText;

  return (
    <Screen edges={['top', 'bottom']} footer={
      <Button
        title={t.scanWithdrawalCode}
        icon={<Icon name="code" size={18} color={colors.accentText} />}
        onPress={() => { setCodeError(null); setShowCodeEntry(true); }}
        disabled={!isMcpActive}
      />
    }>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size={30} />
        <Pressable accessibilityRole="button" accessibilityLabel={t.profile} onPress={() => router.push('/(app)/profile')}>
          <Avatar name={profile?.name} uri={profile?.photoURL} size={44} />
        </Pressable>
      </View>

      <View style={{ gap: 4 }}>
        <AppText variant="title">{mpaAccount?.business_name || t.mcpSubtitle}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {profile?.mcp_id ? <AppText variant="label" color="muted">{profile.mcp_id}</AppText> : null}
          <StatusBadge status={isMcpActive ? 'completed' : 'failed'} label={isMcpActive ? t.agentActive : t.agentInactive} />
        </View>
      </View>

      <Card tone="brand" padding={22} style={{ gap: 16 }}>
        <View style={{ gap: 6 }}>
          <AppText variant="label" style={{ color: onBrand, opacity: 0.85 }}>{t.mpaBalance}</AppText>
          <AppText variant="amount" style={{ color: onBrand }}>{formatMoney(Number(mpaAccount?.balance || 0))}</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, padding: 12, borderRadius: radii.control, backgroundColor: 'rgba(255,255,255,0.14)' }}>
            <AppText variant="caption" style={{ color: onBrand, opacity: 0.85 }}>{t.totalCommissionsEarned}</AppText>
            <AppText variant="heading" style={{ color: onBrand }}>{formatMoney(Number(mpaAccount?.total_commissions_earned || 0))}</AppText>
          </View>
          <View style={{ flex: 1, padding: 12, borderRadius: radii.control, backgroundColor: 'rgba(255,255,255,0.14)' }}>
            <AppText variant="caption" style={{ color: onBrand, opacity: 0.85 }}>{t.walletBalance}</AppText>
            <AppText variant="heading" style={{ color: onBrand }}>{formatMoney(Number(profile?.wallet_balance || 0))}</AppText>
          </View>
        </View>
      </Card>

      {lastConfirmation ? (
        <Card style={{ gap: 10, borderColor: colors.accent, borderWidth: 1.5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Sticker name="cash" size={52} />
            <AppText variant="heading">{t.handOverCash}</AppText>
          </View>
          <AppText variant="amount" color="accent">{formatMoney(Number(lastConfirmation.client_net || 0))}</AppText>
          <DetailRow label={t.amountSent} value={formatMoney(Number(lastConfirmation.gross_amount || 0))} />
          <DetailRow label={`${t.yourCommission} (7%)`} value={formatMoney(Number(lastConfirmation.mcp_commission || 0))} />
          <DetailRow label={`${t.monetCommission} (3%)`} value={formatMoney(Number(lastConfirmation.monet_commission || 0))} />
        </Card>
      ) : null}

      <View style={{ gap: 10 }}>
        <AppText variant="heading" accessibilityRole="header">{t.transactionHistory}</AppText>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          {transactions.length ? transactions.map((item, i) => {
            const isComm = item.type === 'kiosk_commission';
            return (
              <View key={item.id}>
                {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 72 }} /> : null}
                <TransactionRow
                  title={isComm ? t.kioskCommission : t.deposit}
                  subtitle={[formatTxDate(item.timestamp, lang, true), isComm && item.client_cash_handed != null ? `${t.cashHandedLabel} ${formatMoney(Number(item.client_cash_handed))}` : null].filter(Boolean).join(' · ')}
                  amount={Number(item.commission_earned || item.amount || 0)}
                  direction="in"
                  icon={isComm ? 'cash' : 'arrow-down-left'}
                />
              </View>
            );
          }) : (
            <EmptyState art={<Character name="kiosk" size={130} />} title={t.agentEmptyTitle} message={t.agentEmptyHint} />
          )}
        </Card>
      </View>

      <Sheet visible={showCodeEntry} onClose={() => setShowCodeEntry(false)} title={t.enterWithdrawalCode}>
        <AppText variant="body" color="muted">{t.withdrawalCodeSubtitle}</AppText>
        <TextInput
          accessibilityLabel={t.enterWithdrawalCode}
          value={withdrawalCode}
          onChangeText={(text) => { setWithdrawalCode(text.replace(/\D/g, '').slice(0, 6)); setCodeError(null); }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          placeholder="000000"
          placeholderTextColor={colors.muted}
          style={{
            fontFamily: 'Sora_700Bold', fontSize: 40, letterSpacing: 10, textAlign: 'center', color: colors.text,
            paddingVertical: 16, borderRadius: radii.control, borderWidth: 1.5,
            borderColor: codeError ? colors.error : colors.border, backgroundColor: colors.background,
          }}
        />
        {codeError ? <AppText variant="caption" color="error" accessibilityLiveRegion="polite">{codeError}</AppText> : null}
        <Button title={t.confirmHandOverCash} onPress={handleConfirm} loading={confirmLoading} disabled={withdrawalCode.length !== 6} />
      </Sheet>
    </Screen>
  );
}
