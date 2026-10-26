import { Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Option<T extends string> = { value: T; label: string; icon?: IconName; disabled?: boolean };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `chips` scrolls horizontally (filters); `tiles` fills the row (choices like a payment source). */
  variant?: 'chips' | 'tiles';
};

export function Segmented<T extends string>({ options, value, onChange, variant = 'chips' }: Props<T>) {
  const { colors, radii } = useTheme();

  if (variant === 'tiles') {
    return (
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 10 }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: !!o.disabled }}
              disabled={o.disabled}
              onPress={() => onChange(o.value)}
              style={{
                flex: 1,
                minHeight: 76,
                borderRadius: radii.control,
                borderWidth: 1.5,
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accentSoft : colors.card,
                padding: 12,
                gap: 8,
                justifyContent: 'space-between',
                opacity: o.disabled ? 0.45 : 1,
              }}
            >
              {o.icon ? <Icon name={o.icon} size={20} color={active ? 'accent' : 'textSecondary'} /> : null}
              <AppText variant="label" style={{ color: active ? colors.accentSoftText : colors.text, fontSize: 13 }}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              minHeight: 36,
              paddingHorizontal: 14,
              borderRadius: radii.pill,
              justifyContent: 'center',
              backgroundColor: active ? colors.text : colors.card,
              borderWidth: 1,
              borderColor: active ? colors.text : colors.border,
            }}
          >
            <AppText variant="label" style={{ color: active ? colors.background : colors.text, fontSize: 13 }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
