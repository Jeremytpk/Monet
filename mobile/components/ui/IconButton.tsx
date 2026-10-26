import { Pressable } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  /** Required: icon-only buttons need a spoken label. */
  label: string;
  onPress?: () => void;
  variant?: 'outline' | 'plain' | 'soft';
  size?: number;
};

/** 44 px square icon button (minimum touch target). */
export function IconButton({ icon, label, onPress, variant = 'outline', size = 44 }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.accentSoft : variant === 'soft' ? colors.accentSoft : variant === 'outline' ? colors.card : 'transparent',
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: colors.border,
      })}
    >
      <Icon name={icon} size={20} color={variant === 'soft' ? 'accent' : 'text'} />
    </Pressable>
  );
}
