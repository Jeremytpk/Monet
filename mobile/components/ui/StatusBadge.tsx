import { View } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { AppText } from './AppText';

export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'cancelled';

const LABELS: Record<TransactionStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

/** Status pill. Pass `label` to show translated text. */
export function StatusBadge({ status, label }: { status: TransactionStatus; label?: string }) {
  const { colors, radii } = useTheme();
  const tones = {
    completed: { bg: colors.successSoft, fg: colors.accentSoftText },
    pending: { bg: colors.warningSoft, fg: colors.warning },
    failed: { bg: colors.errorSoft, fg: colors.error },
    cancelled: { bg: colors.border, fg: colors.muted },
  } as const;
  const tone = tones[status] ?? tones.pending;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: tone.bg, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
      <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 16, color: tone.fg }}>
        {label ?? LABELS[status] ?? status}
      </AppText>
    </View>
  );
}
