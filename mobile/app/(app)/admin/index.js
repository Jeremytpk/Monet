import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function AdminHome() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();
  if (!profile || String(profile.role || '').toLowerCase() !== 'admin') return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Admin Dashboard</Text>

      <View style={styles.grid}>
        <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(app)/admin/users')}>
          <Ionicons name="people-outline" size={28} color={colors.accent} />
          <Text style={[styles.tileText, { color: colors.text }]}>Users</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(app)/admin/transactions')}>
          <Ionicons name="swap-horizontal-outline" size={28} color={colors.accent} />
          <Text style={[styles.tileText, { color: colors.text }]}>Transactions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(app)/admin/activities')}>
          <Ionicons name="reader-outline" size={28} color={colors.accent} />
          <Text style={[styles.tileText, { color: colors.text }]}>Activities</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(app)/admin/ads')}>
          <Ionicons name="megaphone-outline" size={28} color={colors.accent} />
          <Text style={[styles.tileText, { color: colors.text }]}>Ads</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  tile: { width: '48%', padding: 18, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  tileText: { marginTop: 8, fontSize: 15, fontWeight: '600' },
});
