import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/useAuth';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import { LanguageProvider } from '../lib/LanguageContext';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Logo, AppText } from '../components/ui';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav({ fontsReady }) {
  const router = useRouter();
  const segments = useSegments();
  const { user, profile, setUser, setProfile, loading, setLoading } = useAuth();
  const { isDark: themeIsDark, colors } = useTheme();
  const isInsideApp = segments[0] === '(app)';

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  useEffect(() => {
    let unsubProfile;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      if (!u) {
        setProfile(null);
        setLoading(false);
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        return;
      }
      unsubProfile = onSnapshot(doc(db, 'users', u.uid), async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          if (data.force_logout) {
            try { await updateDoc(doc(db, 'users', u.uid), { force_logout: false }); } catch (e) {}
            await signOut(auth);
            router.replace('/(app)/(tabs)/wallet');
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
    });
    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user && (!profile || !profile.wallet_id)) {
      router.replace('/(auth)/onboarding');
      return;
    }
    // If user has 'mcp' role, redirect to MCP Dashboard
    if (user && profile && String(profile.role || '').toLowerCase() === 'mcp') {
      router.replace('/(app)/admin/mcp-dashboard');
      return;
    }
    if (!isInsideApp) {
      router.replace('/(app)/(tabs)/wallet');
    }
  }, [user, profile, loading, isInsideApp]);

  if (!fontsReady) return null; // native splash stays up until fonts load

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={themeIsDark ? 'light' : 'dark'} />
        <Logo size={48} />
        <AppText variant="caption" color="muted" style={styles.poweredBy}>powered by Jerttech</AppText>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={themeIsDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poweredBy: {
    position: 'absolute',
    bottom: 48,
  },
});

export default function RootLayout() {
  // If a font fails to load, carry on with system fonts rather than block the app.
  const [fontsLoaded, fontError] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RootLayoutNav fontsReady={fontsLoaded || !!fontError} />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
