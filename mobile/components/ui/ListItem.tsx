import { Pressable, View } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import type { ThemeColors } from '../../lib/theme/tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Tone = 'accent' | 'highlight' | 'neutral' | 'error';

/** Rounded square holding an icon; tone sets the tint. */
export function IconChip({ icon, tone = 'accent', size = 40 }: { icon: IconName; tone?: Tone; size?: number }) {
  const { colors } = useTheme();
  const map: Record<Tone, { bg: string; fg: keyof ThemeColors }> = {
    accent: { bg: colors.accentSoft, fg: 'accent' },
    highlight: { bg: colors.highlightSoft, fg: 'highlightText' },
    neutral: { bg: colors.background, fg: 'textSecondary' },
    error: { bg: colors.errorSoft, fg: 'error' },
  };
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: map[tone].bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={size * 0.5} color={map[tone].fg} />
    </View>
  );
}

type ItemProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  tone?: Tone;
  /** Text shown on the right (e.g. a value). */
  value?: string;
  /** Custom right-hand element (e.g. a Switch). Replaces the chevron. */
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
};

/** A row in a settings-style list. Shows a chevron when pressable. */
export function ListItem({ title, subtitle, icon, tone = 'accent', value, right, onPress, destructive }: ItemProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 60,
        backgroundColor: pressed ? colors.accentSoft : 'transparent',
      })}
    >
      {icon ? <IconChip icon={icon} tone={destructive ? 'error' : tone} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" color={destructive ? 'error' : 'text'} style={{ fontSize: 15 }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="label" color="muted" numberOfLines={1} style={{ maxWidth: '45%' }}>
          {value}
        </AppText>
      ) : null}
      {right ?? (onPress ? <Icon name="chevron-right" size={18} color="muted" /> : null)}
    </Pressable>
  );
}

/** A card grouping ListItems with hairline separators and an optional section title. */
export function ListGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  const { colors, radii } = useTheme();
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      {title ? (
        <AppText variant="label" color="muted" style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 12, marginLeft: 4 }}>
          {title}
        </AppText>
      ) : null}
      <View style={{ backgroundColor: colors.card, borderRadius: radii.card - 4, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 70 }} /> : null}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}
