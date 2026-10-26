import { View, type ViewProps } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';

type Props = ViewProps & {
  /** `brand` is the filled malachite card used for the wallet balance. */
  tone?: 'default' | 'brand';
  padding?: number;
};

export function Card({ tone = 'default', padding = 20, style, ...rest }: Props) {
  const { colors, radii } = useTheme();
  const toneStyle =
    tone === 'brand'
      ? { backgroundColor: colors.accent }
      : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };
  return <View style={[{ borderRadius: radii.card, padding }, toneStyle, style]} {...rest} />;
}
