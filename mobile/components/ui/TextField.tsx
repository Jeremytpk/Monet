import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { AppText } from './AppText';

type Props = TextInputProps & {
  label: string;
  /** Shown under the field in the error colour; also marks the field invalid. */
  error?: string | null;
  hint?: string;
  /** Large Sora digits, for amount entry. */
  amount?: boolean;
};

export function TextField({ label, error, hint, amount = false, style, onFocus, onBlur, ...rest }: Props) {
  const { colors, radii, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.accent : colors.border;

  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
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
          {
            minHeight: 56,
            borderWidth: 1.5,
            borderColor,
            borderRadius: radii.control,
            paddingHorizontal: 16,
            backgroundColor: colors.card,
            color: colors.text,
          },
          style,
        ]}
        {...rest}
      />
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
