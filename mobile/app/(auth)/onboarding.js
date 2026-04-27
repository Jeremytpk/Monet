import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { createWalletUser } from '../../lib/functions';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../lib/useAuth';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';

export default function OnboardingScreen() {
  const { setProfile } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) {
      Alert.alert(t.error, t.errNamePhone);
      return;
    }
    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      try {
        await createWalletUser(trimmedName, trimmedPhone, 'USD');
      } catch (fnErr) {
        const code = fnErr?.code || '';
        const isNotFound = code === 'functions/not-found' || code === 'functions/unavailable' || /not-found|not found/i.test(fnErr?.message || '');
        if (isNotFound) {
          await setDoc(doc(db, 'users', uid), {
            name: trimmedName,
            phone: trimmedPhone,
            wallet_id: `monet_${uid}`,
            wallet_balance: 0,
            currency: 'USD',
            updated_at: serverTimestamp(),
          }, { merge: true });
        } else {
          throw fnErr;
        }
      }
      const snap = await getDoc(doc(db, 'users', uid));
      setProfile(snap.exists() ? snap.data() : null);
    } catch (e) {
      Alert.alert(t.error, e?.message || t.errCreateWallet);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{t.createWallet}</Text>
        <Text style={styles.subtitle}>{t.createWalletSubtitle}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.fullName}
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          editable={!loading}
        />
        <Text style={styles.inputLabel}>{t.phoneNumber}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.phonePlaceholder}
          placeholderTextColor={colors.muted}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          editable={!loading}
        />
        <Text style={styles.hint}>{t.phoneHint}</Text>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.buttonText}>{t.continue}</Text>
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
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 32,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 28,
    },
    inputLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    hint: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 6,
      marginBottom: 14,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 14,
      padding: 18,
      fontSize: 17,
      color: colors.text,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      padding: 18,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.accentText,
    },
  });
}
