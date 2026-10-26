import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Screen } from '../../components/ui';
import { AuthForm } from '../../components/AuthForm';

export default function LoginScreen() {
  const router = useRouter();

  // Route by profile state: no wallet yet → onboarding; agents → kiosk dashboard;
  // admins → admin; everyone else → wallet.
  async function routeSignedIn(user) {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const data = snap.exists() ? snap.data() || {} : null;
      const role = String(data?.role || '').toLowerCase();
      if (!data || !data.wallet_id) return router.replace('/(auth)/onboarding');
      if (role === 'mcp') return router.replace('/(app)/admin/mcp-dashboard');
      if (role === 'admin') return router.replace('/(app)/admin');
      router.replace('/(app)/(tabs)/wallet');
    } catch {
      router.replace('/(app)/(tabs)/wallet');
    }
  }

  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ paddingTop: 40 }}>
      <AuthForm onSignedUp={() => router.replace('/(auth)/onboarding')} onSignedIn={routeSignedIn} />
    </Screen>
  );
}
