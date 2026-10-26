import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { formatMoney } from '../../lib/format';
import { AppText } from './AppText';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  label: string;
  /** Shown under the amount, e.g. "Available $1,250.00". */
  available?: number;
  availableLabel?: string;
  error?: string | null;
  /** Quick-pick chips, in dollars. */
  presets?: number[];
};

/** Keep digits and one decimal point, max two decimals. */
function sanitize(text: string) {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

/** Large centred amount entry with a $ prefix and optional quick-pick chips. */
export function AmountInput({ value, onChangeText, label, available, availableLabel, error, presets }: Props) {
  const { colors, typography, radii } = useTheme();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
      <AppText variant="label" color="muted">
        {label}
      </AppText>
      <Pressable onPress={() => input.current?.focus()} style={{ flexDirection: 'row', alignItems: 'center' }} accessible={false}>
        <AppText style={[typography.amount, { fontSize: 48, lineHeight: 56, color: value ? colors.text : colors.muted }]}>$</AppText>
        <TextInput
          ref={input}
          accessibilityLabel={label}
          value={value}
          onChangeText={(v) => onChangeText(sanitize(v))}
          placeholder="0"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          style={[typography.amount, { fontSize: 48, lineHeight: 56, color: colors.text, minWidth: 40, padding: 0, fontVariant: ['tabular-nums'] }]}
        />
      </Pressable>
      {error ? (
        <AppText variant="caption" color="error" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : available != null ? (
        <AppText variant="caption" color="muted">
          {availableLabel ?? 'Available'} {formatMoney(available)}
        </AppText>
      ) : null}
      {presets?.length ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          {presets.map((p) => (
            <Pressable
              key={p}
              accessibilityRole="button"
              accessibilityLabel={formatMoney(p)}
              onPress={() => onChangeText(String(p))}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                minHeight: 36,
                justifyContent: 'center',
                borderRadius: radii.pill,
                backgroundColor: pressed ? colors.accentSoft : colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <AppText variant="label">${p}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
