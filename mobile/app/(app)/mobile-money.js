import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../lib/LanguageContext';
import { Header, ListGroup, ListItem, Screen, StatusBadge } from '../../components/ui';

export default function MobileMoneyServicesScreen() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.servicesTitle} subtitle={t.servicesSubtitle} />
      <ListGroup>
        <ListItem
          icon="phone"
          title={t.sendToMobileMoney}
          subtitle={t.sendToMobileMoneySubtitle}
          onPress={() => router.push('/(app)/withdraw')}
        />
        <ListItem
          icon="kiosk"
          tone="highlight"
          title={t.cashWithdrawal}
          subtitle={t.withdrawCashSubtitle}
          onPress={() => router.push('/(app)/kiosk-withdraw')}
        />
        <ListItem
          icon="topup"
          tone="neutral"
          title={t.buyTopUp}
          subtitle={t.topUpSubtitle}
          right={<StatusBadge status="pending" label={t.comingSoon} />}
          onPress={() => Alert.alert(t.buyTopUp, t.comingSoonMsg)}
        />
      </ListGroup>
    </Screen>
  );
}
