import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/ThemeContext';

type Props = {
  children: React.ReactNode;
  /** Scrollable content (default). Pass false for screens that manage their own list. */
  scroll?: boolean;
  /** Sticky footer, e.g. the screen's primary button. */
  footer?: React.ReactNode;
  /** Safe-area edges to pad. Tab screens keep the default (the tab bar handles the bottom);
   *  stacked screens pass ['top', 'bottom']. */
  edges?: Edge[];
  contentStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Standard screen: themed background, safe area, 20 px gutters, keyboard aware. */
export function Screen({ children, scroll = true, footer, edges = ['top'], contentStyle, refreshing, onRefresh }: Props) {
  const { colors, spacing } = useTheme();
  const padded: ViewStyle = { paddingHorizontal: 20, paddingTop: spacing.xs, paddingBottom: spacing.xl, gap: spacing.lg };

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[padded, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, padded, { paddingBottom: 0 }, contentStyle]}>{children}</View>
        )}
        {footer ? (
          <SafeAreaView
            edges={edges.includes('bottom') ? ['bottom'] : []}
            style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }}
          >
            {footer}
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
