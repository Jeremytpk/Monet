import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="withdraw" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-money" options={{ presentation: 'modal' }} />
      <Stack.Screen name="login" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
