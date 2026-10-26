import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../lib/ThemeContext';
import { palette } from '../../lib/theme/tokens';
import { AppText } from './AppText';

const ARCHES = 'M10 29 V19 a5 5 0 0 1 10 0 V29 M20 19 a5 5 0 0 1 10 0 V29';

/**
 * The Monet mark: an "m" of two arches (a bridge between two homes) with a copper
 * head above the centre stem, so it also reads as a confident person.
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  const { isDark } = useTheme();
  const tile = isDark ? palette.malachite300 : palette.malachite700;
  const stroke = isDark ? palette.ink : palette.white;
  const head = isDark ? palette.copper400 : palette.copper500;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect width={40} height={40} rx={11} fill={tile} />
      <Path d={ARCHES} fill="none" stroke={stroke} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={20} cy={8} r={3} fill={head} />
    </Svg>
  );
}

/** Mark + "monet" wordmark. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <View accessible accessibilityLabel="Monet" style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }}>
      <LogoMark size={size} />
      <AppText style={{ fontFamily: 'Sora_700Bold', fontSize: size * 0.8, letterSpacing: -size * 0.02, lineHeight: size }}>
        monet
      </AppText>
    </View>
  );
}
