import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';

export default function PlusScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);

  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const carriers = [
    { id: 'airtel', name: 'Airtel', code: '*121*6*2#' },
    { id: 'vodacom', name: 'Vodacom', code: '*111#' }, // Example code, replace with actual
    { id: 'orange', name: 'Orange', code: '#123#' }, // Example code, replace with actual
  ];

  const handleCheckData = () => {
    if (!selectedCarrier) return;
    const telUrl = `tel:${encodeURIComponent(selectedCarrier.code)}`;
    Linking.openURL(telUrl);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t.mobileMoneyPlus || 'Mobile Money & Plus' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.plusMenuItem}>
            <View style={styles.plusMenuItemContent}>
              <Ionicons name="cellular-outline" size={22} color={colors.text} />
              <Text style={styles.plusMenuItemText}>{t.checkDataBalance || 'Check Data Balance'}</Text>
            </View>
          </View>

          <View style={styles.plusMenuExpanded}>
            <Text style={styles.fieldLabel}>{t.selectCarrier || 'Select a Carrier'}</Text>
            <View style={styles.carrierRow}>
              {carriers.map((carrier) => {
                const isSelected = selectedCarrier?.id === carrier.id;
                return (
                  <TouchableOpacity
                    key={carrier.id}
                    style={[
                      styles.carrierChip,
                      isSelected && styles.carrierChipSelected,
                      { backgroundColor: isSelected ? colors.accent : colors.background },
                    ]}
                    onPress={() => setSelectedCarrier(carrier)}
                  >
                    <Text style={[styles.carrierChipText, { color: isSelected ? colors.accentText : colors.text }]}>
                      {carrier.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[
                styles.button,
                !selectedCarrier && styles.buttonDisabled,
                { marginTop: 16, paddingVertical: 16, borderRadius: 16 },
              ]}
              onPress={handleCheckData}
              disabled={!selectedCarrier}
              activeOpacity={0.85}
            >
              <Ionicons name="call-outline" size={20} color={colors.accentText} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>{t.checkData || 'Proceed to Check'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingTop: 24 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 24,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonIcon: { marginRight: 10 },
    buttonText: { fontSize: 17, fontWeight: '700', color: colors.accentText },
    carrierRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: 12,
    },
    carrierChip: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    carrierChipSelected: {
      borderColor: colors.accent,
      borderWidth: 2,
    },
    carrierChipText: {
      fontWeight: '600',
    },
    plusMenuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 16,
    },
    plusMenuItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    plusMenuItemText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    plusMenuExpanded: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
  });
}