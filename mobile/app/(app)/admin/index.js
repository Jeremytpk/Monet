import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/useAuth';
import { useLanguage } from '../../../lib/LanguageContext';
import { adminBackfillProfiles } from '../../../lib/functions';
import { AppText, Header, ListGroup, ListItem, Screen } from '../../../components/ui';

export default function AdminHome() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [syncing, setSyncing] = useState(false);
  if (!profile || String(profile.role || '').toLowerCase() !== 'admin') return null;

  async function handleSyncProfiles() {
    setSyncing(true);
    try {
      const { count } = await adminBackfillProfiles();
      Alert.alert(t.profilesSynced, t.profilesSyncedMsg.replace('{n}', String(count)));
    } catch (err) {
      Alert.alert(t.error, err.message || String(err));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.adminDashboard} subtitle={t.adminSubtitle} />

      <ListGroup title={t.adminManage}>
        <ListItem icon="users" title={t.adminUsers} subtitle={t.adminUsersHint} onPress={() => router.push('/(app)/admin/users')} />
        <ListItem icon="receipt" title={t.adminTransactions} subtitle={t.adminTransactionsHint} onPress={() => router.push('/(app)/admin/transactions')} />
        <ListItem icon="activity" title={t.globalActivity} subtitle={t.globalActivityHint} onPress={() => router.push('/(app)/admin/activities')} />
        <ListItem icon="megaphone" tone="highlight" title={t.adminAds} subtitle={t.adminAdsSubtitle} onPress={() => router.push('/(app)/admin/ads')} />
        <ListItem icon="sparkle" tone="highlight" title={t.adMakerTitle} subtitle={t.adMakerHint} onPress={() => router.push('/(app)/admin/ad-maker')} />
      </ListGroup>

      <ListGroup title={t.adminMaintenance}>
        <ListItem
          icon="refresh"
          tone="neutral"
          title={syncing ? t.syncing : t.syncProfiles}
          subtitle={t.syncProfilesHint}
          onPress={syncing ? undefined : handleSyncProfiles}
        />
      </ListGroup>

      <View style={{ paddingHorizontal: 4 }}>
        <AppText variant="caption" color="muted">{t.adminFooter}</AppText>
      </View>
    </Screen>
  );
}
