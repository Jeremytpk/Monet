import { useEffect } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import Constants from 'expo-constants';
import { auth } from '../../../lib/firebase';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';
import { getPaymentMethods } from '../../../lib/functions';
import { AppText, Avatar, Icon, ListGroup, ListItem, LogoMark, Screen } from '../../../components/ui';
import { GuestPrompt } from '../../../components/GuestPrompt';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, setProfile } = useAuth();
  const { colors, isDark, setTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    if (!user?.uid) return;
    getPaymentMethods().then((data) => {
      setProfile((p) => (p ? { ...p, card_last4: data.card?.last4, bank_account_last4: data.bank?.account_last4 } : null));
    }).catch(() => {});
  }, [user?.uid]);

  const fundingSummary = [
    profile?.card_last4 && `${t.cardShort} •••• ${profile.card_last4}`,
    profile?.bank_account_last4 && `${t.bankShort} •••• ${profile.bank_account_last4}`,
  ].filter(Boolean).join(' · ') || t.noneAdded;

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/(app)/(tabs)/wallet');
    Alert.alert(t.success, t.successSignedOut, [{ text: t.ok }]);
  }

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">{t.settings}</AppText>

      {!user ? (
        <GuestPrompt />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${profile?.name || ''}, ${t.editProfile}`}
          onPress={() => router.push('/(app)/profile')}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 20,
            backgroundColor: pressed ? colors.accentSoft : colors.card, borderWidth: 1, borderColor: colors.border,
          })}
        >
          <Avatar name={profile?.name || user?.email} uri={profile?.photoURL || profile?.photoUrl} size={60} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" numberOfLines={1}>{profile?.name || '—'}</AppText>
            <AppText variant="caption" color="muted" numberOfLines={1}>{user?.email}</AppText>
            <AppText variant="label" color="accent" style={{ marginTop: 4 }}>{t.editProfile}</AppText>
          </View>
          <Icon name="chevron-right" size={18} color="muted" />
        </Pressable>
      )}

      {user ? (
        <ListGroup title={t.paymentMethods}>
          <ListItem icon="card" title={t.cardBankAccount} subtitle={fundingSummary} onPress={() => router.push('/(app)/payment-methods')} />
        </ListGroup>
      ) : null}

      <ListGroup title={t.preferences}>
        <ListItem
          icon={isDark ? 'moon' : 'sun'}
          title={t.darkMode}
          onPress={() => setTheme(isDark ? 'light' : 'dark')}
          right={
            <Switch
              accessibilityLabel={t.darkMode}
              value={isDark}
              onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <ListItem
          icon="globe"
          title={t.language}
          value={lang === 'fr' ? 'Français' : 'English'}
          onPress={() => setLang(lang === 'en' ? 'fr' : 'en')}
        />
      </ListGroup>

      {user && isAdmin ? (
        <ListGroup title={t.adminSection}>
          <ListItem icon="grid" title={t.adminDashboard} onPress={() => router.push('/(app)/admin')} />
          <ListItem icon="activity" title={t.globalActivity} onPress={() => router.push('/(app)/admin/activities')} />
        </ListGroup>
      ) : null}

      <ListGroup title={t.app}>
        <ListItem icon="info" title={t.about} onPress={() => router.push('/(app)/about')} />
        <ListItem icon="shield" tone="neutral" title={t.version} value={version} />
      </ListGroup>

      {user ? (
        <ListGroup>
          <ListItem icon="logout" title={t.signOut} destructive onPress={handleSignOut} right={<View />} />
        </ListGroup>
      ) : null}

      <View style={{ alignItems: 'center', gap: 8, paddingTop: 8 }}>
        <LogoMark size={28} />
        <AppText variant="caption" color="muted">{t.footerText}</AppText>
      </View>
    </Screen>
  );
}
