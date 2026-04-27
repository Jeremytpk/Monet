import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/useAuth';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';
import { initiatePayout } from '../../lib/functions';

const PROVIDERS = [
  { id: 'mpesa', name: 'M-Pesa' },
  { id: 'airtel', name: 'Airtel Money' },
  { id: 'orange', name: 'Orange Money' },
];

export default function WithdrawScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(false);

  const balance = profile?.wallet_balance ?? 0;

  async function handleWithdraw() {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      Alert.alert(t.error, t.errValidAmount);
      return;
    }
    if (num > balance) {
      Alert.alert(t.error, t.errInsufficientBalance);
      return;
    }
    if (!provider) {
      Alert.alert(t.error, t.errSelectProvider);
      return;
    }
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.transferToMobileMoney}</Text>
      <Text style={styles.available}>{t.available}: USD {balance.toFixed(2)}</Text>

      <Text style={styles.label}>{t.amountUSD}</Text>
      <TextInput
        style={styles.input}
        placeholder="0.00"
        placeholderTextColor={colors.muted}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        editable={!loading}
      />

      <Text style={styles.label}>{t.provider}</Text>
      <View style={styles.providers}>
        {PROVIDERS.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.providerChip, provider === p.id && styles.providerChipSelected]}
            onPress={() => setProvider(p.id)}
            disabled={loading}
          >
            <Text style={[styles.providerChipText, provider === p.id && styles.providerChipTextSelected]}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleWithdraw}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={styles.buttonText}>{t.withdraw}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingTop: 56 },
    title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 8 },
    available: { fontSize: 15, color: colors.textSecondary, marginBottom: 24 },
    label: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      fontSize: 24,
      color: colors.text,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    providers: { flexDirection: 'row', gap: 12, marginBottom: 28 },
    providerChip: {
      flex: 1,
      backgroundColor: colors.card,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    providerChipSelected: { borderColor: colors.accent, backgroundColor: 'rgba(13, 148, 136, 0.12)' },
    providerChipText: { fontSize: 15, fontWeight: '600', color: colors.text },
    providerChipTextSelected: { color: colors.accent },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { fontSize: 18, fontWeight: '700', color: colors.accentText },
  });
}
