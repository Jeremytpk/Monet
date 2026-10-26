import { Image, View } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { AppText } from './AppText';

type Props = {
  name?: string | null;
  uri?: string | null;
  size?: number;
  /** Highlight ring, e.g. for a selected recipient. */
  selected?: boolean;
};

function initials(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ name, uri, size = 44, selected = false }: Props) {
  const { colors } = useTheme();
  const ring = selected ? { borderWidth: 2.5, borderColor: colors.accent } : null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, ring]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <AppText style={{ fontFamily: 'Sora_600SemiBold', fontSize: size * 0.36, color: colors.accentSoftText }}>{initials(name)}</AppText>
      )}
    </View>
  );
}
