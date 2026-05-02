import { Stack } from 'expo-router';
import { useTheme } from '../../../lib/ThemeContext';
import { TouchableOpacity, Text } from 'react-native';

export default function AdminLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.background, borderBottomWidth: 0 },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerTitleAlign: 'center',
        headerLeft: () => (
          navigation?.canGoBack?.() ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 12 }}>
              <Text style={{ color: colors.accent, fontWeight: '600' }}>Back</Text>
            </TouchableOpacity>
          ) : null
        ),
      })}
    >
      <Stack.Screen name="index" options={{ title: 'Admin' }} />
      <Stack.Screen name="users" options={{ title: 'Users' }} />
      <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Stack.Screen name="activities" options={{ title: 'Activities' }} />
      <Stack.Screen name="ads" options={{ title: 'Ads' }} />
      <Stack.Screen name="mcp-dashboard" options={{ headerShown: false }} />
    </Stack>
  );
}
