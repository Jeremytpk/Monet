import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/useAuth';
import { useLanguage } from '../../lib/LanguageContext';
import { addMoneyToWallet } from '../../lib/functions';
import { formatMoney } from '../../lib/format';
import { AmountInput, AppText, Card, Header, Screen, Segmented } from '../../components/ui';
import { Button } from '../../components/ui';

export default function AddMoneyScreen() {
  const router = useRouter();
  const { profile, setProfile } = useAuth();
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const num = parseFloat(amount) || 0;

  async function handleAdd() {
    if (!num || num <= 0) {
      setError(t.errValidAmount);
      return;
    }
    setLoading(true);
    try {
      await addMoneyToWallet(num, source);
      setProfile((p) => (p ? { ...p, wallet_balance: (p.wallet_balance ?? 0) + num } : null));
      Alert.alert(t.success, t.addedToWallet.replace('{amount}', formatMoney(num)));
      router.back();
    } catch (e) {
      setError(e.message || t.errCouldNotAdd);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<Button title={num > 0 ? `${t.addMoney} ${formatMoney(num)}` : t.addMoney} onPress={handleAdd} loading={loading} disabled={!(num > 0)} />}
    >
      <Header back="close" title={t.addMoneyTitle} subtitle={t.addMoneySubtitleScreen} />

      <Card>
        <AmountInput
          label={t.amountUSD}
          value={amount}
          onChangeText={(v) => { setAmount(v); setError(null); }}
          available={Number(profile?.wallet_balance ?? 0)}
          availableLabel={t.currentBalance}
          error={error}
          presets={[25, 50, 100, 250]}
        />
      </Card>

      <View style={{ gap: 12 }}>
        <AppText variant="heading" accessibilityRole="header">{t.from}</AppText>
        <Segmented
          variant="tiles"
          value={source}
          onChange={setSource}
          options={[
            { value: 'card', label: t.creditCard, icon: 'card' },
            { value: 'debit', label: t.debitCard, icon: 'card' },
            { value: 'bank', label: t.bankAccount, icon: 'bank' },
          ]}
        />
      </View>
    </Screen>
  );
}
