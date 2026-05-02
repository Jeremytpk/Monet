import { useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
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

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.appName}>Monet</Text>
        <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
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
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 40,
    letterSpacing: 2,
  },
  logo: {
    width: 140,
    height: 140,
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
