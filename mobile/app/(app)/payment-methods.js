import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { useAuth } from '../../lib/useAuth';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';
import { getPaymentMethods, savePaymentMethod } from '../../lib/functions';
import { AppText, Button, Header, Icon, IconChip, Screen, Sheet, TextField } from '../../components/ui';

// Only last 4 digits and metadata are stored; full card/account numbers are never saved.
function getLast4(value) {
  return (value || '').replace(/\D/g, '').slice(-4);
}

/** A saved method drawn as a small card; empty state invites adding one. */
function MethodTile({ kind, title, detail, onPress, actionLabel }) {
  const { colors, radii, isDark } = useTheme();
  const filled = !!detail;
  const fg = isDark ? colors.background : colors.accentText;

  if (!filled) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 120, borderRadius: radii.card - 4, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border,
          backgroundColor: pressed ? colors.accentSoft : colors.card, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16,
        })}
      >
        <IconChip icon={kind === 'card' ? 'card' : 'bank'} />
        <AppText variant="bodyStrong">{actionLabel}</AppText>
      </Pressable>
    );
  }

  return (
    <View style={{ minHeight: 150, borderRadius: radii.card - 4, padding: 20, justifyContent: 'space-between', backgroundColor: kind === 'card' ? colors.accent : colors.text, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Icon name={kind === 'card' ? 'card' : 'bank'} size={26} color={kind === 'card' ? fg : colors.background} />
        <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <AppText variant="label" style={{ color: kind === 'card' ? fg : colors.background }}>{actionLabel}</AppText>
        </Pressable>
      </View>
      <View style={{ gap: 4 }}>
        <AppText style={{ fontFamily: 'Sora_600SemiBold', fontSize: 20, letterSpacing: 2, color: kind === 'card' ? fg : colors.background }}>{detail}</AppText>
        <AppText variant="caption" style={{ color: kind === 'card' ? fg : colors.background, opacity: 0.8 }}>{title}</AppText>
      </View>
    </View>
  );
}

export default function PaymentMethodsScreen() {
  const { user, setProfile } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeForm, setActiveForm] = useState(null); // 'card' | 'bank'
  const [errors, setErrors] = useState({});
  const [paymentMethods, setPaymentMethods] = useState({ card: null, bank: null });

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardName, setCardName] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankRouting, setBankRouting] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  const card = paymentMethods.card;
  const bank = paymentMethods.bank;

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
    loadPaymentMethods().finally(() => setLoading(false));
  }, [user?.uid]);

  function openForm(kind) {
    setErrors({});
    setActiveForm(kind);
  }

  async function saveCard() {
    const next = {};
    if (getLast4(cardNumber).length !== 4) next.cardNumber = t.invalidCardMsg;
    const [month, year = ''] = cardExpiry.split('/').map((s) => s.trim());
    const expMonth = parseInt(month, 10);
    const expYear = parseInt(year, 10);
    const fullYear = expYear >= 100 ? expYear : 2000 + expYear;
    if (!expMonth || expMonth < 1 || expMonth > 12 || !expYear || year.length < 2) next.expiry = t.invalidExpiryMsg;
    setErrors(next);
    if (Object.keys(next).length) return;

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
      setErrors({ form: e.message || t.errSaveCard });
    } finally {
      setSaving(false);
    }
  }

  async function saveBank() {
    const routing = bankRouting.trim().replace(/\D/g, '');
    const next = {};
    if (!bankHolder.trim()) next.holder = t.requiredMsg;
    if (routing.length !== 9) next.routing = t.invalidRoutingMsg;
    if (getLast4(bankAccount).length !== 4) next.account = t.invalidAccountMsg;
    setErrors(next);
    if (Object.keys(next).length) return;

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
      setErrors({ form: e.message || t.errSaveBank });
    } finally {
      setSaving(false);
    }
  }

  const clear = (key) => setErrors((e) => ({ ...e, [key]: null, form: null }));

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.paymentMethodsTitle} subtitle={t.paymentMethodsSubtitle} />

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={{ gap: 10 }}>
            <AppText variant="heading" accessibilityRole="header">{t.debitOrCreditCardSection}</AppText>
            <MethodTile
              kind="card"
              title={`${card?.holder_name || t.cardShort} · ${t.expires} ${String(card?.exp_month || '').padStart(2, '0')}/${(card?.exp_year || 0) % 100}`}
              detail={card?.last4 ? `•••• •••• •••• ${card.last4}` : null}
              actionLabel={card?.last4 ? t.update : t.addCard}
              onPress={() => openForm('card')}
            />
          </View>

          <View style={{ gap: 10 }}>
            <AppText variant="heading" accessibilityRole="header">{t.bankAccountSection}</AppText>
            <MethodTile
              kind="bank"
              title={`${bank?.account_holder_name || ''} · ${t.routingShort} ${bank?.routing_number || ''}`}
              detail={bank?.account_last4 ? `•••• ${bank.account_last4}` : null}
              actionLabel={bank?.account_last4 ? t.update : t.addBank}
              onPress={() => openForm('bank')}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <IconChip icon="shield" />
            <AppText variant="caption" color="muted" style={{ flex: 1 }}>{t.paymentDisclaimer}</AppText>
          </View>
        </>
      )}

      <Sheet visible={activeForm === 'card'} onClose={() => setActiveForm(null)} title={card?.last4 ? t.updateCard : t.addCard}>
        <TextField
          label={t.cardNumberLabel}
          icon="card"
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChangeText={(v) => { setCardNumber((v.replace(/\D/g, '').slice(0, 16).match(/.{1,4}/g) || []).join(' ')); clear('cardNumber'); }}
          keyboardType="number-pad"
          maxLength={19}
          editable={!saving}
          error={errors.cardNumber}
        />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <TextField
              label={t.expiryLabel}
              placeholder="12/28"
              value={cardExpiry}
              onChangeText={(v) => {
                let d = v.replace(/\D/g, '').slice(0, 4);
                if (d.length >= 2) d = d.slice(0, 2) + '/' + d.slice(2);
                setCardExpiry(d);
                clear('expiry');
              }}
              keyboardType="number-pad"
              maxLength={5}
              editable={!saving}
              error={errors.expiry}
            />
          </View>
        </View>
        <TextField label={t.cardholderName} placeholder="Jean Mukendi" value={cardName} onChangeText={setCardName} autoComplete="name" editable={!saving} />
        {errors.form ? <AppText variant="caption" color="error">{errors.form}</AppText> : null}
        <Button title={card?.last4 ? t.updateCard : t.saveCard} onPress={saveCard} loading={saving} />
      </Sheet>

      <Sheet visible={activeForm === 'bank'} onClose={() => setActiveForm(null)} title={bank?.account_last4 ? t.updateBankAccount : t.addBank}>
        <TextField label={t.accountHolderName} icon="user" value={bankHolder} onChangeText={(v) => { setBankHolder(v); clear('holder'); }} editable={!saving} error={errors.holder} />
        <TextField
          label={t.routingNumber}
          placeholder="123456789"
          value={bankRouting}
          onChangeText={(v) => { setBankRouting(v.replace(/\D/g, '').slice(0, 9)); clear('routing'); }}
          keyboardType="number-pad"
          maxLength={9}
          editable={!saving}
          error={errors.routing}
        />
        <TextField
          label={t.accountNumberLabel}
          placeholder="••••••••"
          value={bankAccount}
          onChangeText={(v) => { setBankAccount(v.replace(/\D/g, '').slice(0, 17)); clear('account'); }}
          keyboardType="number-pad"
          editable={!saving}
          error={errors.account}
        />
        {errors.form ? <AppText variant="caption" color="error">{errors.form}</AppText> : null}
        <Button title={bank?.account_last4 ? t.updateBankAccount : t.saveBankAccount} onPress={saveBank} loading={saving} />
      </Sheet>
    </Screen>
  );
}
