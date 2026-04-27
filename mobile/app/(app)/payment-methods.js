import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
import { getPaymentMethods, savePaymentMethod } from '../../lib/functions';

// Only last 4 digits and metadata are stored; full card/account numbers are never saved.
function getLast4(value) {
  const digits = (value || '').replace(/\D/g, '');
  return digits.slice(-4);
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { user, profile, setProfile } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState({ card: null, bank: null });

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardName, setCardName] = useState('');

  const [bankHolder, setBankHolder] = useState('');
  const [bankRouting, setBankRouting] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  const card = paymentMethods.card;
  const bank = paymentMethods.bank;
  const cardLast4 = card?.last4;
  const cardExpMonth = card?.exp_month;
  const cardExpYear = card?.exp_year;
  const cardHolderName = card?.holder_name;
  const bankAccountHolder = bank?.account_holder_name;
  const bankRoutingNumber = bank?.routing_number;
  const bankAccountLast4 = bank?.account_last4;

  async function loadPaymentMethods() {
    try {
      const data = await getPaymentMethods();
      setPaymentMethods({ card: data.card || null, bank: data.bank || null });
      setProfile((p) => (p ? {
        ...p,
        card_last4: data.card?.last4,
        card_exp_month: data.card?.exp_month,
        card_exp_year: data.card?.exp_year,
        card_holder_name: data.card?.holder_name,
        bank_account_holder: data.bank?.account_holder_name,
        bank_routing: data.bank?.routing_number,
        bank_account_last4: data.bank?.account_last4,
      } : null));
      setCardName(data.card?.holder_name || '');
      setBankHolder(data.bank?.account_holder_name || '');
      setBankRouting(data.bank?.routing_number || '');
    } catch {
      setPaymentMethods({ card: null, bank: null });
    }
  }

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      await loadPaymentMethods();
      setLoading(false);
    })();
  }, [user?.uid]);

  function formatCardNumber(value) {
    const v = value.replace(/\D/g, '').slice(0, 16);
    const parts = v.match(/.{1,4}/g) || [];
    setCardNumber(parts.join(' '));
  }

  function formatExpiry(value) {
    let v = value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
    setCardExpiry(v);
  }

  function formatRouting(value) {
    setBankRouting(value.replace(/\D/g, '').slice(0, 9));
  }

  function formatBankAccount(value) {
    setBankAccount(value.replace(/\D/g, '').slice(0, 17));
  }

  async function saveCard() {
    const last4 = getLast4(cardNumber);
    if (last4.length !== 4) {
      Alert.alert(t.invalidCard, t.invalidCardMsg);
      return;
    }
    const [month, year] = cardExpiry.split('/').map((s) => s.trim());
    const expMonth = parseInt(month, 10);
    const expYear = parseInt(year, 10);
    const fullYear = expYear >= 100 ? expYear : 2000 + expYear;
    if (!expMonth || expMonth < 1 || expMonth > 12 || !expYear || year.length < 2) {
      Alert.alert(t.invalidExpiry, t.invalidExpiryMsg);
      return;
    }
    setSaving(true);
    try {
      await savePaymentMethod('card', {
        card_number: cardNumber.replace(/\s/g, ''),
        exp_month: expMonth,
        exp_year: fullYear,
        holder_name: cardName.trim() || undefined,
      });
      await loadPaymentMethods();
      setCardNumber('');
      setCardExpiry('');
      setActiveForm(null);
      Alert.alert(t.saved, t.cardSavedMsg);
    } catch (e) {
      Alert.alert(t.error, e.message || t.errSaveCard);
    } finally {
      setSaving(false);
    }
  }

  async function saveBank() {
    const routing = bankRouting.trim().replace(/\D/g, '');
    const last4 = getLast4(bankAccount);
    if (routing.length !== 9) {
      Alert.alert(t.invalidRouting, t.invalidRoutingMsg);
      return;
    }
    if (last4.length !== 4) {
      Alert.alert(t.invalidAccountNumber, t.invalidAccountMsg);
      return;
    }
    if (!bankHolder.trim()) {
      Alert.alert(t.required, t.requiredMsg);
      return;
    }
    setSaving(true);
    try {
      await savePaymentMethod('bank', {
        routing_number: routing,
        account_number: bankAccount.replace(/\D/g, ''),
        account_holder_name: bankHolder.trim(),
      });
      await loadPaymentMethods();
      setBankAccount('');
      setActiveForm(null);
      Alert.alert(t.saved, t.bankSavedMsg);
    } catch (e) {
      Alert.alert(t.error, e.message || t.errSaveBank);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="close" size={28} color={colors.text} />
      </TouchableOpacity>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t.paymentMethodsTitle}</Text>
        <Text style={styles.subtitle}>{t.paymentMethodsSubtitle}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.debitOrCreditCardSection}</Text>
          <View style={styles.card}>
            {cardLast4 ? (
              <View style={styles.savedRow}>
                <View style={styles.savedLeft}>
                  <Ionicons name="card" size={24} color={colors.accent} />
                  <View>
                    <Text style={styles.savedLabel}>{cardHolderName || 'Card'}</Text>
                    <Text style={styles.savedDetail}>•••• {cardLast4} · Exp {String(cardExpMonth).padStart(2, '0')}/{cardExpYear % 100}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setActiveForm(activeForm === 'card' ? null : 'card')}>
                  <Text style={[styles.link, { color: colors.accent }]}>{activeForm === 'card' ? t.cancel : t.update}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {(!cardLast4 || activeForm === 'card') && (
              <View style={styles.form}>
                <Text style={styles.fieldLabel}>{t.cardNumberLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={colors.muted}
                  value={cardNumber}
                  onChangeText={formatCardNumber}
                  keyboardType="number-pad"
                  maxLength={19}
                  editable={!saving}
                />
                <Text style={styles.fieldLabel}>{t.expiryLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12/28"
                  placeholderTextColor={colors.muted}
                  value={cardExpiry}
                  onChangeText={formatExpiry}
                  keyboardType="number-pad"
                  maxLength={5}
                  editable={!saving}
                />
                <Text style={styles.fieldLabel}>{t.cardholderName}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={colors.muted}
                  value={cardName}
                  onChangeText={setCardName}
                  autoCapitalize="words"
                  editable={!saving}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={saveCard} disabled={saving} activeOpacity={0.85}>
                  {saving ? <ActivityIndicator color={colors.accentText} /> : <Text style={styles.primaryButtonText}>{t.saveCard}</Text>}
                </TouchableOpacity>
              </View>
            )}
            {cardLast4 && activeForm !== 'card' && (
              <TouchableOpacity style={styles.addAnother} onPress={() => setActiveForm('card')}>
                <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                <Text style={[styles.addAnotherText, { color: colors.accent }]}>{t.updateCard}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.bankAccountSection}</Text>
          <View style={styles.card}>
            {bankAccountLast4 ? (
              <View style={styles.savedRow}>
                <View style={styles.savedLeft}>
                  <Ionicons name="business" size={24} color={colors.accent} />
                  <View>
                    <Text style={styles.savedLabel}>{bankAccountHolder || t.bankAccountSection}</Text>
                    <Text style={styles.savedDetail}>•••• {bankAccountLast4} · Routing {bankRoutingNumber}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setActiveForm(activeForm === 'bank' ? null : 'bank')}>
                  <Text style={[styles.link, { color: colors.accent }]}>{activeForm === 'bank' ? t.cancel : t.update}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {(!bankAccountLast4 || activeForm === 'bank') && (
              <View style={styles.form}>
                <Text style={styles.fieldLabel}>{t.accountHolderName}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={colors.muted}
                  value={bankHolder}
                  onChangeText={setBankHolder}
                  autoCapitalize="words"
                  editable={!saving}
                />
                <Text style={styles.fieldLabel}>{t.routingNumber}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="021000021"
                  placeholderTextColor={colors.muted}
                  value={bankRouting}
                  onChangeText={formatRouting}
                  keyboardType="number-pad"
                  maxLength={9}
                  editable={!saving}
                />
                <Text style={styles.fieldLabel}>{t.accountNumberLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.accountNumberLabel}
                  placeholderTextColor={colors.muted}
                  value={bankAccount}
                  onChangeText={formatBankAccount}
                  keyboardType="number-pad"
                  editable={!saving}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={saveBank} disabled={saving} activeOpacity={0.85}>
                  {saving ? <ActivityIndicator color={colors.accentText} /> : <Text style={styles.primaryButtonText}>{t.saveBankAccount}</Text>}
                </TouchableOpacity>
              </View>
            )}
            {bankAccountLast4 && activeForm !== 'bank' && (
              <TouchableOpacity style={styles.addAnother} onPress={() => setActiveForm('bank')}>
                <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                <Text style={[styles.addAnotherText, { color: colors.accent }]}>{t.updateBankAccount}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.disclaimer}>{t.paymentDisclaimer}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { justifyContent: 'center', alignItems: 'center' },
    scroll: { flex: 1 },
    content: { padding: 24, paddingTop: 56, paddingBottom: 40 },
    closeButton: { position: 'absolute', top: 48, right: 24, zIndex: 10 },
    title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 8 },
    subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 28 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    savedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    savedLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    savedLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
    savedDetail: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    link: { fontSize: 15, fontWeight: '600' },
    form: { gap: 14 },
    fieldLabel: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    primaryButtonText: { fontSize: 16, fontWeight: '700', color: colors.accentText },
    addAnother: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    addAnotherText: { fontSize: 15, fontWeight: '600' },
    disclaimer: { fontSize: 13, color: colors.muted, marginTop: 8, lineHeight: 18 },
  });
}
