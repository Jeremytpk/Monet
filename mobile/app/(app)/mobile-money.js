import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';

export default function MobileMoneyServicesScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.servicesTitle || 'Mobile Money & More'}</Text>
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t.servicesSubtitle || 'Choose a service below'}
      </Text>

      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push('/(app)/withdraw')}
        activeOpacity={0.8}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.isDark ? 'rgba(234, 179, 8, 0.25)' : 'rgba(234, 179, 8, 0.15)' }]}>
          <Ionicons name="phone-portrait-outline" size={24} color={colors.accent} />
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t.sendToMobileMoney || 'Send to Mobile Money'}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t.sendToMobileMoneySubtitle || 'M-Pesa, Airtel, Orange'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => alert("Top up feature coming soon!")}
        activeOpacity={0.8}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.isDark ? 'rgba(234, 179, 8, 0.25)' : 'rgba(234, 179, 8, 0.15)' }]}>
          <Ionicons name="cellular-outline" size={24} color={colors.accent} />
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t.buyTopUp || 'Buy Top Up'}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t.topUpSubtitle || 'Recharge any phone instantly'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: Platform.OS === 'ios' ? 56 : 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 15, marginBottom: 24, paddingLeft: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  cardSubtitle: { fontSize: 14 },
});