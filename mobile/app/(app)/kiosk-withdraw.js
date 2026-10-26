import { useState } from 'react';
import { Alert, View } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../lib/useAuth';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';
import { initiateKioskCashOut } from '../../lib/kiosk';
import { db } from '../../lib/firebase';
import { formatMoney } from '../../lib/format';
import {
  AmountInput,
  AppText,
  Button,
  Card,
  CodeDisplay,
  DetailRow,
  Header,
  IconChip,
  Screen,
  Sheet,
  TextField,
} from '../../components/ui';
import { IllustratedBanner } from '../../components/IllustratedBanner';
import { Character, Sticker } from '../../components/brand';

const FEE_RATE = 0.10; // preview only; the server computes the real split

export default function KioskWithdraw() {
  const { colors, radii } = useTheme();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [mcpIdInput, setMcpIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [mcpToConfirm, setMcpToConfirm] = useState(null);
  const [withdrawalCode, setWithdrawalCode] = useState(null);
  const [fees, setFees] = useState(null);
  const balance = Number(profile?.wallet_balance || 0);
  const num = parseFloat(amount) || 0;

  async function handleVerifyMcp() {
    const next = {
      amount: !num || num <= 0 ? t.invalidAmount : num > balance ? t.insufficientWalletLow : null,
      mcp: mcpIdInput.trim() ? null : t.errAmountAndMcpId,
    };
    setErrors(next);
    if (next.amount || next.mcp) return;

    setLoading(true);
    try {
      const searchStr = mcpIdInput.trim().toUpperCase().replace('MCP', '');
      const snap = await getDocs(query(collection(db, 'profiles'), where('is_agent', '==', true)));
      const mcpDoc = snap.docs.find((d) => {
        const mcpId = d.data().mcp_id;
        return mcpId && mcpId.toUpperCase().includes(searchStr);
      });
      if (!mcpDoc) {
        setErrors({ mcp: t.errMcpNotFound });
        return;
      }
      const data = mcpDoc.data();
      setMcpToConfirm({ uid: mcpDoc.id, name: data.name || t.kioskPartner, mcp_id: data.mcp_id });
    } catch (err) {
      Alert.alert(t.error, err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInitiateWithdrawal() {
    if (!mcpToConfirm) return;
    setLoading(true);
    try {
      const result = await initiateKioskCashOut(num, mcpToConfirm.uid);
      if (result.success) {
        setWithdrawalCode(result.withdrawal_code);
        setFees(result.fees);
      }
    } catch (err) {
      setMcpToConfirm(null);
      Alert.alert(t.error, err.message);
    } finally {
      setLoading(false);
    }
  }

  function closeSheet() {
    if (!withdrawalCode) {
      setMcpToConfirm(null);
      return;
    }
    Alert.alert(t.confirmCloseCodeTitle, t.confirmCloseCodeMsg, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.close,
        style: 'destructive',
        onPress: () => {
          setMcpToConfirm(null);
          setWithdrawalCode(null);
          setFees(null);
          setAmount('');
          setMcpIdInput('');
        },
      },
    ]);
  }

  return (
    <Screen edges={['top', 'bottom']} footer={<Button title={t.verifyKiosk} onPress={handleVerifyMcp} loading={loading && !mcpToConfirm} />}>
      <Header back="close" />
      <IllustratedBanner tone="copper" title={t.cashWithdrawal} body={t.withdrawCashSubtitle} art={<Character name="kiosk" size={120} />} />

      <Card>
        <AmountInput
          label={t.amountUSD}
          value={amount}
          onChangeText={(v) => { setAmount(v); setErrors((e) => ({ ...e, amount: null })); }}
          available={balance}
          availableLabel={t.available}
          error={errors.amount}
          presets={[20, 50, 100]}
        />
        {num > 0 ? (
          <View style={{ marginTop: 12, gap: 6, padding: 14, borderRadius: radii.control, backgroundColor: colors.background }}>
            <DetailRow label={`${t.totalCommission} (10%)`} value={`−${formatMoney(num * FEE_RATE)}`} />
            <DetailRow label={t.cashToReceive} value={formatMoney(num * (1 - FEE_RATE))} strong />
          </View>
        ) : null}
      </Card>

      <TextField
        label={t.kioskMcpId}
        icon="kiosk"
        placeholder="MCP1234567"
        value={mcpIdInput}
        onChangeText={(v) => { setMcpIdInput(v.toUpperCase().replace(/\s/g, '')); setErrors((e) => ({ ...e, mcp: null })); }}
        autoCapitalize="characters"
        error={errors.mcp}
        hint={t.kioskIdHint}
      />

      <Card style={{ gap: 12 }}>
        <AppText variant="heading">{t.nextSteps}</AppText>
        {[t.step1, t.step2, t.step3].map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <IconChip icon={['map-pin', 'code', 'cash'][i]} size={36} tone={i === 2 ? 'highlight' : 'accent'} />
            <AppText variant="body" style={{ flex: 1 }}>{s.replace(/^\d\.\s*/, '')}</AppText>
          </View>
        ))}
      </Card>

      <Sheet visible={!!mcpToConfirm} onClose={closeSheet} title={withdrawalCode ? t.activeWithdrawalCode : t.verifyKiosk}>
        {withdrawalCode ? (
          <>
            <View style={{ alignItems: 'center' }}><Sticker name="cash" size={88} /></View>
            <AppText variant="body" color="muted">{t.showCodeToAgent}</AppText>
            <CodeDisplay code={withdrawalCode} />
            <View style={{ gap: 8 }}>
              <DetailRow label={t.amount} value={formatMoney(Number(fees?.grossAmount ?? num))} />
              <DetailRow label={t.totalCommission} value={`−${formatMoney(Number(fees?.totalFees ?? num * FEE_RATE))}`} />
              <DetailRow label={t.cashToReceive} value={formatMoney(Number(fees?.clientNet ?? num * (1 - FEE_RATE)))} strong />
            </View>
            <AppText variant="caption" color="muted">{t.codeValidFor}</AppText>
            <Button title={t.done} onPress={closeSheet} />
          </>
        ) : (
          <>
            <AppText variant="body" color="muted">{t.verifyKioskMsg}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radii.control, backgroundColor: colors.background }}>
              <IconChip icon="kiosk" tone="highlight" size={48} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{mcpToConfirm?.name}</AppText>
                <AppText variant="caption" color="muted">{mcpToConfirm?.mcp_id}</AppText>
              </View>
            </View>
            <DetailRow label={t.cashToReceive} value={formatMoney(num * (1 - FEE_RATE))} strong />
            <Button title={t.confirm} onPress={handleInitiateWithdrawal} loading={loading} />
          </>
        )}
      </Sheet>
    </Screen>
  );
}
