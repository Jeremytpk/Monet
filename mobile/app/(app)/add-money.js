import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/useAuth';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';
import { addMoneyToWallet } from '../../lib/functions';

export default function AddMoneyScreen() {
  const router = useRouter();
  const { setProfile } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('card');
  const [loading, setLoading] = useState(false);

  const addSources = [
    { id: 'bank', label: t.bankAccount, icon: 'business' },
    { id: 'card', label: t.creditCard, icon: 'card' },
    { id: 'debit', label: t.debitCard, icon: 'card-outline' },
  ];

  async function handleAdd() {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      Alert.alert(t.error, t.errValidAmount);
      return;
    }
    setLoading(true);
    try {
      await addMoneyToWallet(num, source);
      setProfile((p) => (p ? { ...p, wallet_balance: (p.wallet_balance ?? 0) + num } : null));
      Alert.alert(t.success, `$${num.toFixed(2)} ${t.addMoneySubtitleScreen.split(' ').slice(-3).join(' ')}`);
      router.back();
    } catch (e) {
      Alert.alert(t.error, e.message || t.errCouldNotAdd);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="close" size={28} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>{t.addMoneyTitle}</Text>
        <Text style={styles.subtitle}>{t.addMoneySubtitleScreen}</Text>

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

        <Text style={styles.label}>{t.from}</Text>
        <View style={styles.sourceList}>
          {addSources.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.sourceRow, source === s.id && styles.sourceRowSelected]}
              onPress={() => setSource(s.id)}
            >
              <Ionicons
                name={s.icon}
                size={24}
                color={source === s.id ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.sourceLabel, source === s.id && styles.sourceLabelSelected]}>
                {s.label}
              </Text>
              {source === s.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAdd}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.buttonText}>{t.addMoney} $ {amount || '0.00'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    closeButton: {
      position: 'absolute',
      top: 56,
      right: 24,
      zIndex: 10,
      padding: 4,
    },
    content: {
      flex: 1,
      padding: 24,
      paddingTop: 80,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 32,
    },
    label: {
      fontSize: 13,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      fontSize: 24,
      color: colors.text,
      marginBottom: 28,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sourceList: { marginBottom: 32 },
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      backgroundColor: colors.card,
      padding: 18,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    sourceRowSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.isDark ? 'rgba(13, 148, 136, 0.12)' : 'rgba(13, 148, 136, 0.08)',
    },
    sourceLabel: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text },
    sourceLabelSelected: { color: colors.accent },
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
