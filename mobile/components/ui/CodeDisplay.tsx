import { View } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { AppText } from './AppText';

/** A 6-digit withdrawal code, large and spaced so an agent can read it off the screen. */
export function CodeDisplay({ code, label }: { code?: string | null; label?: string }) {
  const { colors, radii } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 20, borderRadius: radii.control, backgroundColor: colors.accentSoft }}>
      {label ? <AppText variant="label" color="accentSoftText">{label}</AppText> : null}
      <AppText
        accessibilityLabel={String(code || '').split('').join(' ')}
        style={{ fontFamily: 'Sora_700Bold', fontSize: 40, lineHeight: 48, letterSpacing: 8, color: colors.accentSoftText, fontVariant: ['tabular-nums'] }}
      >
        {code}
      </AppText>
    </View>
  );
}

/** Label/value pair for detail sheets and receipts. */
export function DetailRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, minHeight: 28 }}>
      <AppText variant="label" color="muted">{label}</AppText>
      {typeof value === 'string' ? (
        <AppText variant={strong ? 'bodyStrong' : 'body'} style={{ flexShrink: 1, textAlign: 'right' }}>{value}</AppText>
      ) : value}
    </View>
  );
}
