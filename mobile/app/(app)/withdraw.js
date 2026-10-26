import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/useAuth';
import { useLanguage } from '../../lib/LanguageContext';
import { initiatePayout } from '../../lib/functions';
import { formatMoney } from '../../lib/format';
import { AmountInput, AppText, Button, Card, Header, Screen, Segmented } from '../../components/ui';
import { IllustratedBanner } from '../../components/IllustratedBanner';
import { Sticker } from '../../components/brand';

const PROVIDERS = [
  { value: 'mpesa', label: 'M-Pesa', icon: 'phone' },
  { value: 'airtel', label: 'Airtel Money', icon: 'phone' },
  { value: 'orange', label: 'Orange Money', icon: 'phone' },
];

export default function WithdrawScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const balance = Number(profile?.wallet_balance ?? 0);
  const num = parseFloat(amount) || 0;

  async function handleWithdraw() {
    if (!num || num <= 0) return setError(t.errValidAmount);
    if (num > balance) return setError(t.errInsufficientBalance);
    if (!provider) return Alert.alert(t.error, t.errSelectProvider);
    setLoading(true);
    try {
      await initiatePayout(num, provider);
      Alert.alert(t.success, t.successWithdrawal);
      router.back();
    } catch (e) {
      Alert.alert(t.error, e.message || t.errWithdrawal);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<Button title={num > 0 ? `${t.withdraw} ${formatMoney(num)}` : t.withdraw} onPress={handleWithdraw} loading={loading} disabled={!(num > 0) || !provider} />}
    >
      <Header />
      <IllustratedBanner tone="mint" title={t.transferToMobileMoney} body={t.withdrawSubtitle} art={<Sticker name="topup" size={96} />} />

      <Card>
        <AmountInput
          label={t.amountUSD}
          value={amount}
          onChangeText={(v) => { setAmount(v); setError(null); }}
          available={balance}
          availableLabel={t.available}
          error={error}
          presets={[10, 25, 50, 100]}
        />
      </Card>

      <View style={{ gap: 12 }}>
        <AppText variant="heading" accessibilityRole="header">{t.provider}</AppText>
        <Segmented variant="tiles" value={provider} onChange={setProvider} options={PROVIDERS} />
        <AppText variant="caption" color="muted">
          {t.payoutToPhone.replace('{phone}', profile?.phone || '—')}
        </AppText>
      </View>
    </Screen>
  );
}
