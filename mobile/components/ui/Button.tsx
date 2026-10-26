import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  /** Optional icon (e.g. an <Icon />) shown before the title. */
  icon?: React.ReactNode;
};

/** 52 px tall, 16 px radius. One primary button per screen. */
export function Button({ title, variant = 'primary', loading = false, disabled, icon, style, ...rest }: Props) {
  const { colors, radii } = useTheme();
  const isDisabled = disabled || loading;

  const palettes = {
    primary: { bg: colors.accent, pressed: colors.accentPressed, fg: colors.accentText, border: 'transparent' },
    secondary: { bg: colors.card, pressed: colors.accentSoft, fg: colors.accent, border: colors.accent },
    soft: { bg: colors.accentSoft, pressed: colors.border, fg: colors.accentSoftText, border: 'transparent' },
    ghost: { bg: 'transparent', pressed: colors.accentSoft, fg: colors.accent, border: 'transparent' },
  } as const;
  const p = palettes[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        {
          minHeight: 52,
          borderRadius: radii.control,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          borderColor: p.border,
          backgroundColor: state.pressed ? p.pressed : p.bg,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled && !loading ? 0.5 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon}
          <AppText variant="bodyStrong" style={{ color: p.fg }}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}
