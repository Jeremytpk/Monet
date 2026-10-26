import { Tabs } from 'expo-router';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';
import { Icon } from '../../../components/ui';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const icon = (name) => ({ color, focused }) => <Icon name={name} size={24} color={color} strokeWidth={focused ? 2.2 : 1.8} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 84, paddingTop: 8 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
      }}
    >
      <Tabs.Screen name="wallet" options={{ title: t.tabWallet, tabBarIcon: icon('wallet') }} />
      <Tabs.Screen name="send" options={{ title: t.tabSend, tabBarIcon: icon('send') }} />
      <Tabs.Screen name="activity" options={{ title: t.tabActivity, tabBarIcon: icon('activity') }} />
      <Tabs.Screen name="settings" options={{ title: t.tabSettings, tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
