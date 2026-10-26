import { TextInput, View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { Icon } from './ui';

/** Search field used at the top of admin lists. */
export function AdminSearch({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const { colors, radii, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: radii.control, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
      <Icon name="search" size={18} color="muted" />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={[typography.body, { flex: 1, color: colors.text, paddingVertical: 10 }]}
      />
    </View>
  );
}
