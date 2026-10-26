import { Image, View } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { BrandAvatar, avatarIndexFor } from '../brand';

type Props = {
  name?: string | null;
  uri?: string | null;
  size?: number;
  /** Highlight ring, e.g. for a selected recipient. */
  selected?: boolean;
};

/** A user's photo, or their Monet character avatar (same one on every device). */
export function Avatar({ name, uri, size = 44, selected = false }: Props) {
  const { colors } = useTheme();
  const ring = selected ? { borderWidth: 2.5, borderColor: colors.accent, borderRadius: size / 2 } : null;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={ring}>
      {uri ? (
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.accentSoft }}>
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
        </View>
      ) : (
        <BrandAvatar index={avatarIndexFor(name)} size={size} />
      )}
    </View>
  );
}
