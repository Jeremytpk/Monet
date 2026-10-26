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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      Alert.alert(t.error, t.emailPasswordRequired);
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      Alert.alert(t.error, t.passwordsDoNotMatch || 'Passwords do not match');
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
        // After signup, send user to onboarding to finish profile
        router.replace('/(auth)/onboarding');
        return;
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = cred.user || auth.currentUser;
        if (user && user.uid) {
          // Try to load the user's profile immediately and redirect based on role
          try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (!snap.exists()) {
              // No profile yet -> onboarding
              router.replace('/(auth)/onboarding');
              return;
            }
            const data = snap.data() || {};
            const role = String(data.role || '').toLowerCase();
            if (!data.wallet_id) {
              router.replace('/(auth)/onboarding');
              return;
            }
            if (role === 'mcp') {
              router.replace('/(app)/admin/mcp-dashboard');
              return;
            }
            if (role === 'admin') {
              router.replace('/(app)/admin');
              return;
            }
            // Default to wallet
            router.replace('/(app)/(tabs)/wallet');
            return;
          } catch (err) {
            // If profile read fails, fall back to app root behavior
            router.replace('/(app)/(tabs)/wallet');
            return;
          }
        }
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
      <Image source={require('../../assets/icon.png')} style={styles.headerLogo} resizeMode="contain" />
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
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t.password}
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} hitSlop={12}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>
        {isSignUp && (
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder={t.confirmPassword || 'Confirm password'}
              placeholderTextColor={colors.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon} hitSlop={12}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}
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
    headerLogo: {
      width: 100,
      height: 100,
      alignSelf: 'center',
      marginBottom: 24,
      borderRadius: 50,
      overflow: 'hidden',
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
      textAlign: 'center',
    },
    tagline: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 32,
      textAlign: 'center',
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
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    passwordInput: {
      flex: 1,
      padding: 18,
      fontSize: 17,
      color: colors.text,
    },
    eyeIcon: {
      paddingHorizontal: 16,
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
