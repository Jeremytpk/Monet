import { useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/useAuth';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import { LanguageProvider } from '../lib/LanguageContext';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { user, profile, setUser, setProfile, loading, setLoading } = useAuth();
  const { isDark: themeIsDark } = useTheme();
  const isInsideApp = segments[0] === '(app)';

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user && (!profile || !profile.wallet_id)) {
      router.replace('/(auth)/onboarding');
      return;
    }
    if (!isInsideApp) {
      router.replace('/(app)/(tabs)/wallet');
    }
  }, [user, profile, loading, isInsideApp]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Image source={require('../assets/splash.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.poweredBy}>powered by Jerttech</Text>
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
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '60%',
    height: '60%',
  },
  poweredBy: {
    position: 'absolute',
    bottom: 48,
    color: '#888',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
