import { Stack } from 'expo-router';

// Each admin screen draws its own Header (back button + title) in the Monet style.
export default function AdminLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
