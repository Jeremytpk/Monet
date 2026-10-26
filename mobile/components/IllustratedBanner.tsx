import { View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import type { ThemeColors } from '../lib/theme/tokens';
import { AppText } from './ui';

export type Tone = 'brand' | 'mint' | 'copper' | 'cream';

/** Background/text pairs for illustrated surfaces (all pass AA in both themes). */
export function toneColors(tone: Tone, colors: ThemeColors & { isDark?: boolean }) {
  const dark = !!colors.isDark;
  switch (tone) {
    case 'brand':
      return { bg: colors.accent, fg: dark ? colors.background : colors.accentText, sub: dark ? 'rgba(14,26,23,0.78)' : 'rgba(255,255,255,0.85)' };
    case 'copper':
      return { bg: colors.highlightSoft, fg: colors.text, sub: colors.textSecondary };
    case 'cream':
      return { bg: colors.warningSoft, fg: colors.text, sub: colors.textSecondary };
    default:
      return { bg: colors.accentSoft, fg: colors.text, sub: colors.textSecondary };
  }
}

type Props = { title: string; body?: string; art: React.ReactNode; tone?: Tone };

/** Friendly header card: words on the left, a character or sticker on the right. */
export function IllustratedBanner({ title, body, art, tone = 'mint' }: Props) {
  const { colors, radii } = useTheme();
  const c = toneColors(tone, colors);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', borderRadius: radii.card, backgroundColor: c.bg, overflow: 'hidden', minHeight: 132 }}>
      <View style={{ flex: 1, padding: 20, gap: 6, alignSelf: 'center' }}>
        <AppText variant="heading" style={{ color: c.fg }}>{title}</AppText>
        {body ? <AppText variant="caption" style={{ color: c.sub, fontSize: 14, lineHeight: 20 }}>{body}</AppText> : null}
      </View>
      <View style={{ paddingRight: 12, paddingTop: 12 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{art}</View>
    </View>
  );
}
