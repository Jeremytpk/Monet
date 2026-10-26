import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { createWalletUser } from '../../lib/functions';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../lib/useAuth';
import { useLanguage } from '../../lib/LanguageContext';
import { useTheme } from '../../lib/ThemeContext';
import { AppText, Button, Screen, TextField } from '../../components/ui';
import { Scene, Sticker } from '../../components/brand';

export default function OnboardingScreen() {
  const router = useRouter();
  const { setProfile } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  async function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const next = {
      name: trimmedName ? null : t.errNameRequired,
      phone: trimmedPhone ? null : t.errPhoneRequired,
    };
    setErrors(next);
    if (next.name || next.phone) return;

    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      // Wallets are created server-side only; the client may not set wallet fields.
      await createWalletUser(trimmedName, trimmedPhone, 'USD');
      const snap = await getDoc(doc(db, 'users', uid));
      const data = snap.exists() ? snap.data() : null;
      setProfile(data);
      const role = String(data?.role || '').toLowerCase();
      if (role === 'mcp') return router.replace('/(app)/admin/mcp-dashboard');
      if (role === 'admin') return router.replace('/(app)/admin');
      router.replace('/(app)/(tabs)/wallet');
    } catch (e) {
      setErrors({ form: e?.message || t.errCreateWallet });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ paddingTop: 32 }} footer={<Button title={t.continue} onPress={handleSubmit} loading={loading} />}>
      <View style={{ gap: 16 }}>
        <View style={{ alignItems: 'center', borderRadius: 24, backgroundColor: colors.accentSoft, paddingTop: 16, overflow: 'hidden' }}>
          <Scene name="bridge" width={300} />
        </View>
        <AppText variant="display" accessibilityRole="header">{t.createWallet}</AppText>
        <AppText variant="body" color="muted">{t.createWalletSubtitle}</AppText>
      </View>

      <View style={{ gap: 16 }}>
        <TextField
          label={t.fullName}
          icon="user"
          value={name}
          onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: null })); }}
          autoComplete="name"
          textContentType="name"
          editable={!loading}
          error={errors.name}
        />
        <TextField
          label={t.phoneNumber}
          icon="phone"
          placeholder={t.phonePlaceholder}
          value={phone}
          onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: null })); }}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          editable={!loading}
          error={errors.phone}
          hint={t.phoneHint}
        />
        {errors.form ? <AppText variant="caption" color="error">{errors.form}</AppText> : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Sticker name="safe" size={52} />
        <AppText variant="caption" color="muted" style={{ flex: 1 }}>{t.onboardingPrivacy}</AppText>
      </View>
    </Screen>
  );
}
