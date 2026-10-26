import { View } from 'react-native';
import Constants from 'expo-constants';
import { useLanguage } from '../../lib/LanguageContext';
import { AppText, Card, Header, IconChip, LogoMark, Screen, StatusBadge } from '../../components/ui';

export default function AboutScreen() {
  const { t } = useLanguage();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const pillars = [
    { icon: 'shield', title: t.pillarTrustedTitle, body: t.pillarTrustedBody },
    { icon: 'heart', title: t.pillarCloseTitle, body: t.pillarCloseBody },
    { icon: 'send', title: t.pillarQuickTitle, body: t.pillarQuickBody },
  ];

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.aboutApp} large={false} />

      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
        <LogoMark size={88} />
        <AppText style={{ fontFamily: 'Sora_700Bold', fontSize: 36, letterSpacing: -1 }}>monet</AppText>
        <AppText variant="body" color="muted" style={{ textAlign: 'center' }}>{t.brandLine}</AppText>
        <StatusBadge status="completed" label={`${t.version} ${version}`} />
      </View>

      <Card>
        <AppText variant="body" style={{ lineHeight: 26 }}>{t.aboutDescription}</AppText>
      </Card>

      <View style={{ gap: 16 }}>
        {pillars.map((p) => (
          <View key={p.title} style={{ flexDirection: 'row', gap: 14 }}>
            <IconChip icon={p.icon} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong">{p.title}</AppText>
              <AppText variant="body" color="muted">{p.body}</AppText>
            </View>
          </View>
        ))}
      </View>

      <AppText variant="caption" color="muted" style={{ textAlign: 'center' }}>{t.footerText} · Jerttech</AppText>
    </Screen>
  );
}
