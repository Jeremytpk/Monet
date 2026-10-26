import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../lib/LanguageContext';
import { Header, ListGroup, ListItem, Screen, StatusBadge } from '../../components/ui';
import { IllustratedBanner } from '../../components/IllustratedBanner';
import { Character } from '../../components/brand';

export default function MobileMoneyServicesScreen() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <Screen edges={['top', 'bottom']}>
      <Header />
      <IllustratedBanner tone="cream" title={t.servicesTitle} body={t.servicesBanner} art={<Character name="grace" size={120} />} />
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
