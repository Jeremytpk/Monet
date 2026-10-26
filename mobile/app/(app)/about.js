import { View } from 'react-native';
import Constants from 'expo-constants';
import { useLanguage } from '../../lib/LanguageContext';
import { useTheme } from '../../lib/ThemeContext';
import { AppText, Card, Header, Screen, StatusBadge } from '../../components/ui';
import { Character, Scene, Sticker } from '../../components/brand';

export default function AboutScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const pillars = [
    { sticker: 'safe', title: t.pillarTrustedTitle, body: t.pillarTrustedBody },
    { sticker: 'family', title: t.pillarCloseTitle, body: t.pillarCloseBody },
    { sticker: 'fast', title: t.pillarQuickTitle, body: t.pillarQuickBody },
  ];

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.aboutApp} large={false} />

      <View style={{ alignItems: 'center', gap: 12, paddingBottom: 8 }}>
        <View style={{ alignSelf: 'stretch', alignItems: 'center', borderRadius: 24, backgroundColor: colors.accent, paddingTop: 16, overflow: 'hidden' }}>
          <Scene name="bridge" width={300} dark />
        </View>
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
            <Sticker name={p.sticker} size={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong">{p.title}</AppText>
              <AppText variant="body" color="muted">{p.body}</AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {['jean', 'mama', 'kiosk', 'grace'].map((c) => <Character key={c} name={c} size={84} />)}
      </View>
      <AppText variant="caption" color="muted" style={{ textAlign: 'center' }}>{t.footerText} · Jerttech</AppText>
    </Screen>
  );
}
