import { Text, type TextProps } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import type { ThemeColors, TypographyVariant } from '../../lib/theme/tokens';

type Props = TextProps & {
  variant?: TypographyVariant;
  /** A theme colour name; defaults to `text`. */
  color?: keyof ThemeColors;
};

/** Text in the brand typefaces. Use instead of RN `Text` in new screens. */
export function AppText({ variant = 'body', color = 'text', style, ...rest }: Props) {
  const { colors, typography } = useTheme();
  const numeric = variant === 'amount' ? { fontVariant: ['tabular-nums' as const] } : null;
  return <Text {...rest} style={[typography[variant], { color: colors[color] }, numeric, style]} />;
}
