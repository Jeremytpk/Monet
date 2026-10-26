import { View } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { IconChip } from './ListItem';
import type { IconName } from './Icon';

type Props = {
  icon?: IconName;
  /** A character or sticker; takes the place of the icon. */
  art?: React.ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon = 'info', art, title, message, actionLabel, onAction }: Props) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, gap: 12 }}>
      {art ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{art}</View> : <IconChip icon={icon} size={56} />}
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color="muted" style={{ textAlign: 'center' }}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={{ marginTop: 8, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}
