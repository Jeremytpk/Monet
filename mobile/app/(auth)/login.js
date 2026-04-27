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
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      Alert.alert(t.error, t.emailPasswordRequired);
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          created_at: serverTimestamp(),
        }, { merge: true });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e) {
      Alert.alert(t.error, e.message || t.authFailed);
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
        <Text style={styles.logo}>Monet</Text>
        <Text style={styles.tagline}>{t.tagline}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.emailLabel}
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder={t.password}
          placeholderTextColor={colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.buttonText}>{isSignUp ? t.createAccount : t.signIn}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.switch}
          onPress={() => setIsSignUp((v) => !v)}
          disabled={loading}
        >
          <Text style={styles.switchText}>
            {isSignUp ? t.alreadyHaveAccount : t.noAccount}
          </Text>
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
    logo: {
      fontSize: 42,
      fontWeight: '700',
      color: colors.accent,
      letterSpacing: 1,
      marginBottom: 4,
    },
    tagline: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 32,
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
    switch: {
      marginTop: 20,
      alignItems: 'center',
    },
    switchText: {
      color: colors.muted,
      fontSize: 15,
    },
  });
}
