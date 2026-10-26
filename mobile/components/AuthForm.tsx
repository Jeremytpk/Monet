import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, type User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useLanguage } from '../lib/LanguageContext';
import { useTheme } from '../lib/ThemeContext';
import { AppText, Button, Logo, Segmented, TextField } from './ui';
import { Scene } from './brand';

type Props = {
  onSignedUp: (user: User) => void;
  onSignedIn: (user: User) => void;
  initialMode?: 'signin' | 'signup';
};

/** Friendlier messages for the Firebase errors people actually hit. */
function authMessage(code: string | undefined, t: Record<string, string>, fallback: string) {
  switch (code) {
    case 'auth/invalid-email': return t.errInvalidEmail;
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return t.errWrongCredentials;
    case 'auth/email-already-in-use': return t.errEmailInUse;
    case 'auth/weak-password': return t.errWeakPassword;
    case 'auth/too-many-requests': return t.errTooManyAttempts;
    case 'auth/network-request-failed': return t.errNetwork;
    default: return fallback;
  }
}

/** Email/password sign-in and sign-up, shared by the auth screen and the login modal. */
export function AuthForm({ onSignedUp, onSignedIn, initialMode = 'signin' }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const isSignUp = mode === 'signup';

  async function handleSubmit() {
    setError(null);
    setConfirmError(null);
    if (!email.trim() || !password) {
      setError(t.emailPasswordRequired);
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setConfirmError(t.passwordsDoNotMatch);
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', user.uid), { email: user.email, created_at: serverTimestamp() }, { merge: true });
        onSignedUp(user);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        onSignedIn(cred.user || auth.currentUser!);
      }
    } catch (e: any) {
      setError(authMessage(e?.code, t, e?.message || t.authFailed));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: 24 }}>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <View style={{ alignSelf: 'stretch', alignItems: 'center', borderRadius: 24, backgroundColor: colors.accentSoft, paddingTop: 14, overflow: 'hidden' }}>
          <Scene name="bridge" width={280} />
        </View>
        <Logo size={36} />
        <AppText variant="body" color="muted" style={{ textAlign: 'center' }}>{isSignUp ? t.authTaglineSignup : t.authTagline}</AppText>
      </View>

      <Segmented
        variant="tiles"
        value={mode}
        onChange={(m) => { setMode(m); setError(null); setConfirmError(null); }}
        options={[
          { value: 'signin', label: t.signIn, icon: 'user' },
          { value: 'signup', label: t.createAccount, icon: 'plus' },
        ]}
      />

      <View style={{ gap: 16 }}>
        <TextField
          label={t.emailLabel}
          icon="mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!loading}
          placeholder="you@example.com"
        />
        <TextField
          label={t.password}
          icon="lock"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          revealable
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          textContentType={isSignUp ? 'newPassword' : 'password'}
          editable={!loading}
          onSubmitEditing={isSignUp ? undefined : handleSubmit}
        />
        {isSignUp ? (
          <TextField
            label={t.confirmPassword}
            icon="lock"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            revealable
            editable={!loading}
            error={confirmError}
            onSubmitEditing={handleSubmit}
          />
        ) : null}
        {error ? (
          <AppText variant="caption" color="error" accessibilityLiveRegion="polite">{error}</AppText>
        ) : null}
      </View>

      <Button title={isSignUp ? t.createAccount : t.signIn} onPress={handleSubmit} loading={loading} />

      <Pressable
        accessibilityRole="button"
        onPress={() => setMode(isSignUp ? 'signin' : 'signup')}
        disabled={loading}
        style={{ alignItems: 'center', minHeight: 44, justifyContent: 'center' }}
      >
        <AppText variant="label" color="accent">{isSignUp ? t.alreadyHaveAccount : t.noAccount}</AppText>
      </Pressable>
    </View>
  );
}
