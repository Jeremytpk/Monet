import { useRouter } from 'expo-router';
import { useLanguage } from '../lib/LanguageContext';
import { Card, EmptyState } from './ui';

/** Shown on tabs that need an account when nobody is signed in. */
export function GuestPrompt({ message }: { message?: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  return (
    <Card>
      <EmptyState
        icon="lock"
        title={t.guestTitle}
        message={message ?? t.guestMessage}
        actionLabel={t.logIn}
        onAction={() => router.push('/(app)/login')}
      />
    </Card>
  );
}
