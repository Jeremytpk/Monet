import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';
import { getPaymentMethods } from '../../../lib/functions';

const AVATAR_SIZE = 88;

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, setProfile } = useAuth();
  const { colors, isDark, setTheme } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    if (!user?.uid) return;
    getPaymentMethods().then((data) => {
      setProfile((p) => (p ? {
        ...p,
        card_last4: data.card?.last4,
        bank_account_last4: data.bank?.account_last4,
      } : null));
    }).catch(() => {});
  }, [user?.uid]);

  const photoUrl = profile?.photoURL || profile?.photoUrl;
  const name = profile?.name || user?.email?.split('@')[0] || '?';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  const styles = createStyles(colors);

  if (!user) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, styles.guestContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.guestCenter}>
          <Text style={[styles.screenTitle, styles.guestScreenTitle]}>{t.settings}</Text>
          <View style={styles.guestCard}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.muted} style={styles.guestIcon} />
            <Text style={styles.guestTitle}>{t.signInToAccessSettings}</Text>
            <Text style={styles.guestMessage}>{t.signInMessage}</Text>
            <TouchableOpacity
              style={styles.guestButton}
              onPress={() => router.push('/(app)/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.guestButtonText}>{t.logIn}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>{t.footerText}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>{t.settings}</Text>

      <TouchableOpacity
        style={styles.profileCard}
        activeOpacity={0.8}
        onPress={() => router.push('/(app)/profile')}
      >
        <View style={[styles.avatarWrap, { borderColor: colors.border }]}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
              <Text style={[styles.avatarInitial, { color: colors.textSecondary }]}>{initial}</Text>
            </View>
          )}
        </View>
        <View style={styles.profileCardRight}>
          <Text style={styles.profileName}>{profile?.name || '—'}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={(e) => { e?.stopPropagation?.(); router.push('/(app)/profile'); }}
          >
            <Ionicons name="pencil" size={14} color={colors.accent} />
            <Text style={[styles.editButtonText, { color: colors.accent }]}>{t.edit}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.paymentMethods}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => router.push('/(app)/payment-methods')}
            activeOpacity={0.7}
          >
            <View style={styles.rowButtonLeft}>
              <Ionicons name="card-outline" size={22} color={colors.accent} style={styles.rowIcon} />
              <Text style={[styles.rowButtonLabel, { color: colors.text }]}>{t.cardBankAccount}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{t.fundingSources}</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {[profile?.card_last4 && `Card •••• ${profile.card_last4}`, profile?.bank_account_last4 && `Bank •••• ${profile.bank_account_last4}`].filter(Boolean).join(' · ') || t.noneAdded}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.appearance}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{t.darkMode}</Text>
            <Switch
              value={isDark}
              onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFF"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.account}</Text>
        <View style={styles.card}>
          {String(profile?.role || '').toLowerCase() === 'admin' ? (
            <TouchableOpacity
              style={styles.rowButton}
              onPress={() => router.push('/(app)/admin')}
              activeOpacity={0.7}
            >
              <View style={styles.rowButtonLeft}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.accent} style={styles.rowIcon} />
                <Text style={[styles.rowButtonLabel, { color: colors.text }]}>Admin Dashboard</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.rowButton}
            onPress={async () => {
              await signOut(auth);
              router.replace('/(app)/(tabs)/wallet');
              Alert.alert(t.success, t.successSignedOut, [{ text: t.ok }]);
            }}
          >
            <Text style={[styles.rowButtonLabel, { color: colors.text }]}>{t.signOut}</Text>
            <Ionicons name="log-out-outline" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.app}</Text>
        <View style={styles.card}>
          <View style={[styles.row]}>
            <Text style={styles.rowLabel}>{t.version}</Text>
            <Text style={styles.rowValue} numberOfLines={1}>1.0.0</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.muted }]}>{t.footerText}</Text>
      </View>
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingTop: 56, paddingBottom: 40 },
    screenTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 24,
    },
    guestContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    guestCenter: {
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 24,
    },
    guestScreenTitle: { textAlign: 'center' },
    guestCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: 'center',
      marginBottom: 24,
      width: '100%',
      maxWidth: 400,
    },
    guestIcon: { marginBottom: 16 },
    guestTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
      textAlign: 'center',
    },
    guestMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    guestButton: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 14,
    },
    guestButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.accentText,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginBottom: 28,
    },
    avatarWrap: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      borderWidth: 2,
      overflow: 'hidden',
      marginRight: 18,
    },
    profileCardRight: { flex: 1 },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: 8,
      gap: 4,
    },
    editButtonText: { fontSize: 14, fontWeight: '600' },
    avatar: { width: '100%', height: '100%' },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: { fontSize: 36, fontWeight: '700' },
    profileName: { fontSize: 18, fontWeight: '600', color: colors.text },
    section: { marginBottom: 28 },
    sectionTitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 18,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    rowLabel: { fontSize: 15 },
    rowValue: { fontSize: 15, color: colors.text, fontWeight: '500', maxWidth: '60%' },
    rowButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 18,
    },
    rowButtonLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    rowIcon: { marginRight: 12 },
    rowButtonLabel: { fontSize: 15, fontWeight: '500' },
    footer: { marginTop: 24, alignItems: 'center' },
    footerText: { fontSize: 12 },
  });
}
