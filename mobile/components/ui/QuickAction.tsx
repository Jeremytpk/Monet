import { Pressable } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { AppText } from './AppText';
import { IconChip } from './ListItem';
import type { IconName } from './Icon';

type Props = { icon: IconName; label: string; onPress: () => void; tone?: 'accent' | 'highlight' };

/** Square shortcut tile used in grids on the wallet screen. */
export function QuickAction({ icon, label, onPress, tone = 'accent' }: Props) {
  const { colors, radii } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 96,
        borderRadius: radii.control + 2,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.accentSoft : colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 6,
        paddingVertical: 14,
      })}
    >
      <IconChip icon={icon} tone={tone} />
      <AppText variant="label" numberOfLines={2} style={{ fontSize: 13, textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressable>
  );
}
