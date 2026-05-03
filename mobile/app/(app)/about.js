import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';

export default function AboutScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.aboutApp}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>Monet</Text>
          <Text style={styles.tagline}>{t.footerText || 'Monet — Diaspora to DRC'}</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>{t.version || 'Version'} 1.0.0</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.description}>{t.aboutDescription || 'Monet is a cross-border financial ecosystem designed for the African diaspora to seamlessly and securely send funds to the Democratic Republic of Congo (DRC).'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    backButton: { marginRight: 12, padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    content: { flex: 1 },
    scrollContent: { padding: 24, alignItems: 'center' },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 32,
      marginTop: 24,
    },
    logo: {
      width: 100,
      height: 100,
      borderRadius: 24,
      marginBottom: 16,
    },
    appName: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    tagline: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    versionBadge: {
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    versionText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      width: '100%',
    },
    description: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 24,
      textAlign: 'center',
    },
  });
}