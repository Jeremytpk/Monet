import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Linking, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';

export default function MobileMoneyServicesScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const styles = createStyles(colors);

  // const [showDataCheck, setShowDataCheck] = useState(false);
  // const [selectedCarrier, setSelectedCarrier] = useState(null);
  // const [isInfoModalVisible, setInfoModalVisible] = useState(false);
  // const carriers = [
  //   { id: 'airtel', name: 'Airtel', code: '*121*6*2#' },
  //   { id: 'vodacom', name: 'Vodacom', code: '*111#' }, // Example code, replace with actual
  //   { id: 'orange', name: 'Orange', code: '#123#' }, // Example code, replace with actual
  // ];

  // const handleCheckData = () => {
  //   if (!selectedCarrier) return;
  //   setInfoModalVisible(true);
  // };

  // const proceedWithDial = () => {
  //   setInfoModalVisible(false);
  //   const telUrl = `tel:${encodeURIComponent(selectedCarrier.code)}`;
  //   Linking.openURL(telUrl);
  // };

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

      {/* --- Check Data Balance Card (Hidden) --- */}
      {/*<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>*/}
      {/*  <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setShowDataCheck(!showDataCheck)} activeOpacity={0.8}>*/}
      {/*    <View style={[styles.iconWrap, { backgroundColor: colors.isDark ? 'rgba(234, 179, 8, 0.25)' : 'rgba(234, 179, 8, 0.15)' }]}>*/}
      {/*      <Ionicons name="stats-chart-outline" size={24} color={colors.accent} />*/}
      {/*    </View>*/}
      {/*    <View style={styles.cardText}>*/}
      {/*      <Text style={[styles.cardTitle, { color: colors.text }]}>{t.checkDataBalance || 'Check Data Balance'}</Text>*/}
      {/*      <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t.checkDataBalanceSubtitle || 'Check your internet data'}</Text>*/}
      {/*    </View>*/}
      {/*    <Ionicons name={showDataCheck ? "chevron-down" : "chevron-forward"} size={20} color={colors.muted} />*/}
      {/*  </TouchableOpacity>*/}

      {/*  {showDataCheck && (*/}
      {/*    <View style={styles.expandedContent}>*/}
      {/*      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.selectCarrier || 'Select a Carrier'}</Text>*/}
      {/*      <View style={styles.carrierRow}>*/}
      {/*        {carriers.map((carrier) => {*/}
      {/*          const isSelected = selectedCarrier?.id === carrier.id;*/}
      {/*          return (*/}
      {/*            <TouchableOpacity*/}
      {/*              key={carrier.id}*/}
      {/*              style={[*/}
      {/*                styles.carrierChip,*/}
      {/*                { backgroundColor: colors.background, borderColor: colors.border },*/}
      {/*                isSelected && styles.carrierChipSelected,*/}
      {/*              ]}*/}
      {/*              onPress={() => setSelectedCarrier(carrier)}*/}
      {/*            >*/}
      {/*              <Text style={[styles.carrierChipText, { color: isSelected ? colors.accent : colors.text }]}>*/}
      {/*                {carrier.name}*/}
      {/*              </Text>*/}
      {/*            </TouchableOpacity>*/}
      {/*          );*/}
      {/*        })}*/}
      {/*      </View>*/}
      {/*      <TouchableOpacity*/}
      {/*        style={[styles.button, { backgroundColor: colors.accent }, !selectedCarrier && styles.buttonDisabled]}*/}
      {/*        onPress={handleCheckData}*/}
      {/*        disabled={!selectedCarrier}*/}
      {/*        activeOpacity={0.85}*/}
      {/*      >*/}
      {/*        <Ionicons name="call-outline" size={20} color={colors.accentText} style={{ marginRight: 10 }} />*/}
      {/*        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accentText }}>{t.checkData || 'Proceed to Check'}</Text>*/}
      {/*      </TouchableOpacity>*/}
      {/*    </View>*/}
      {/*  )}*/}
      {/*</View>*/}

      {/* --- Informational Modal (Hidden) --- */}
      {/*<Modal*/}
      {/*  visible={isInfoModalVisible}*/}
      {/*  transparent*/}
      {/*  animationType="fade"*/}
      {/*  onRequestClose={() => setInfoModalVisible(false)}*/}
      {/*>*/}
      {/*  <View style={styles.modalOverlay}>*/}
      {/*    <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>*/}
      {/*      <Ionicons name="information-circle-outline" size={48} color={colors.accent} style={{ alignSelf: 'center', marginBottom: 16 }} />*/}
      {/*      <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center' }]}>*/}
      {/*        {t.manualCheckRequired || 'Manual Check Required'}*/}
      {/*      </Text>*/}
      {/*      <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>*/}
      {/*        {t.manualCheckMessage || `For your security, you must manually complete this step. We will open your phone's dialer with the code for ${selectedCarrier?.name}. Just tap the 'call' button to see your balance.`}*/}
      {/*      </Text>*/}
      {/*      <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>*/}
      {/*        <TouchableOpacity*/}
      {/*          style={[styles.modalButton, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}*/}
      {/*          onPress={() => setInfoModalVisible(false)}*/}
      {/*        >*/}
      {/*          <Text style={{ color: colors.text, fontWeight: '600' }}>{t.cancel || 'Cancel'}</Text>*/}
      {/*        </TouchableOpacity>*/}
      {/*        <TouchableOpacity*/}
      {/*          style={[styles.modalButton, { backgroundColor: colors.accent }]}*/}
      {/*          onPress={proceedWithDial}*/}
      {/*        >*/}
      {/*          <Text style={{ color: colors.accentText, fontWeight: '600' }}>{t.continue || 'Continue'}</Text>*/}
      {/*        </TouchableOpacity>*/}
      {/*      </View>*/}
      {/*    </View>*/}
      {/*  </View>*/}
      {/*</Modal>*/}

    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
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
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  expandedContent: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  carrierRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  carrierChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrierChipSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.isDark ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.12)',
  },
  carrierChipText: {
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});