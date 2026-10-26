import { useState } from 'react';
import { Linking } from 'react-native';
import { useLanguage } from '../../lib/LanguageContext';
import { AppText, Button, Card, Header, Screen, Segmented } from '../../components/ui';

// Not linked from the app yet. The USSD codes are placeholders to confirm per carrier.
const CARRIERS = [
  { value: 'airtel', label: 'Airtel', icon: 'phone', code: '*121*6*2#' },
  { value: 'vodacom', label: 'Vodacom', icon: 'phone', code: '*111#' },
  { value: 'orange', label: 'Orange', icon: 'phone', code: '#123#' },
];

export default function PlusScreen() {
  const { t } = useLanguage();
  const [carrier, setCarrier] = useState('');
  const selected = CARRIERS.find((c) => c.value === carrier);

  return (
    <Screen edges={['top', 'bottom']} footer={
      <Button
        title={t.checkData || 'Check balance'}
        disabled={!selected}
        onPress={() => selected && Linking.openURL(`tel:${encodeURIComponent(selected.code)}`)}
      />
    }>
      <Header title={t.checkDataBalance || 'Check data balance'} subtitle={t.selectCarrier || 'Select a carrier'} />
      <Card>
        <Segmented variant="tiles" value={carrier} onChange={setCarrier} options={CARRIERS} />
      </Card>
      <AppText variant="caption" color="muted">
        {t.manualCheckMessage || "We'll open your phone's dialer with your carrier's code. Tap call to see your balance."}
      </AppText>
    </Screen>
  );
}
