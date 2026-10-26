import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../lib/ThemeContext';
import { useLanguage } from '../lib/LanguageContext';
import { AppText, Button } from './ui';
import { toneColors, type Tone } from './IllustratedBanner';

type Props = {
  /** The character, scene or sticker that matches the screen. */
  art: React.ReactNode;
  title: string;
  message: string;
  tone?: Tone;
};

/**
 * Shown on screens that need an account. Each screen passes its own illustration and
 * copy, so a guest sees what they would get, not a lock.
 */
export function GuestPrompt({ art, title, message, tone = 'mint' }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors, radii } = useTheme();
  const c = toneColors(tone, colors);

  return (
    <View style={{ borderRadius: radii.card, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ backgroundColor: c.bg, alignItems: 'center', justifyContent: 'flex-end', paddingTop: 20, minHeight: 190 }}>{art}</View>
      <View style={{ padding: 22, gap: 10 }}>
        <AppText variant="title" accessibilityRole="header">{title}</AppText>
        <AppText variant="body" color="muted">{message}</AppText>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Button title={t.createFreeAccount} onPress={() => router.push({ pathname: '/(app)/login', params: { mode: 'signup' } })} />
          <Button title={t.iHaveAccount} variant="ghost" onPress={() => router.push('/(app)/login')} />
        </View>
      </View>
    </View>
  );
}
