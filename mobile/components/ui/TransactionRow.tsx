import { Pressable, View } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { formatSignedMoney } from '../../lib/format';
import { AppText } from './AppText';
import { IconChip } from './ListItem';
import type { IconName } from './Icon';
import { StatusBadge, type TransactionStatus } from './StatusBadge';

type Props = {
  title: string;
  subtitle: string;
  amount: number;
  /** Money coming into the wallet shows in the accent colour with a copper chip. */
  direction: 'in' | 'out';
  status?: TransactionStatus;
  statusLabel?: string;
  icon?: IconName;
  onPress?: () => void;
};

export function TransactionRow({ title, subtitle, amount, direction, status, statusLabel, icon, onPress }: Props) {
  const { colors } = useTheme();
  const incoming = direction === 'in';
  const amountText = formatSignedMoney(amount, direction);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}, ${subtitle}, ${amountText}${status ? `, ${statusLabel ?? status}` : ''}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: pressed ? colors.accentSoft : 'transparent' })}
    >
      <IconChip icon={icon ?? (incoming ? 'arrow-down-left' : 'arrow-up-right')} tone={incoming ? 'highlight' : 'accent'} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1} style={{ fontSize: 15 }}>
          {title}
        </AppText>
        <AppText variant="caption" color="muted" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <AppText variant="heading" color={incoming ? 'accent' : 'text'} style={{ fontSize: 15, fontVariant: ['tabular-nums'] }}>
          {amountText}
        </AppText>
        {status ? <StatusBadge status={status} label={statusLabel} /> : null}
      </View>
    </Pressable>
  );
}
