import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = TextInputProps & {
  label: string;
  /** Shown under the field in the error colour; also marks the field invalid. */
  error?: string | null;
  hint?: string;
  /** Large Sora digits, for amount entry. */
  amount?: boolean;
  /** Leading icon inside the field. */
  icon?: IconName;
  /** For passwords: adds a show/hide button. */
  revealable?: boolean;
};

export function TextField({ label, error, hint, amount = false, icon, revealable, secureTextEntry, style, onFocus, onBlur, ...rest }: Props) {
  const { colors, radii, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.accent : colors.border;

  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label">{label}</AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 56,
          borderWidth: 1.5,
          borderColor,
          borderRadius: radii.control,
          paddingLeft: icon ? 14 : 16,
          paddingRight: revealable ? 4 : 16,
          gap: 10,
          backgroundColor: colors.card,
        }}
      >
        {icon ? <Icon name={icon} size={20} color={focused ? 'accent' : 'muted'} /> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry && !revealed}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            amount ? { ...typography.title, fontVariant: ['tabular-nums'] } : typography.body,
            { flex: 1, color: colors.text, paddingVertical: 14 },
            style,
          ]}
          {...rest}
        />
        {revealable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed((v) => !v)}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name={revealed ? 'eye-off' : 'eye'} size={20} color="muted" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="error" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
