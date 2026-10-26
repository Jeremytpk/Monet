import { useRouter } from 'expo-router';
import { Header, Screen } from '../../components/ui';
import { AuthForm } from '../../components/AuthForm';

/** Login opened as a modal from the tabs. The root layout redirects new users to onboarding. */
export default function LoginModal() {
  const router = useRouter();
  return (
    <Screen edges={['top', 'bottom']}>
      <Header back="close" />
      <AuthForm onSignedUp={() => router.back()} onSignedIn={() => router.back()} />
    </Screen>
  );
}
