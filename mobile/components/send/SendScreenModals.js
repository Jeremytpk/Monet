import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const KioskSearchModal = ({
  visible,
  onClose,
  styles,
  colors,
  t,
  kioskSearchId,
  setKioskSearchId,
  handleSearchKiosk,
  kioskSearchLoading,
  foundKiosk,
  onSelectKiosk,
}) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.findKiosk || 'Find Kiosk'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>{t.kioskMcpId || 'Kiosk MCP ID'}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TextInput
              style={[styles.modalInput, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. MCP1234567"
              placeholderTextColor={colors.muted}
              value={kioskSearchId}
              onChangeText={(text) => setKioskSearchId(text.toUpperCase().replace(/\s/g, ''))}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: colors.accent }]}
              onPress={handleSearchKiosk}
              disabled={kioskSearchLoading || !kioskSearchId}
            >
              {kioskSearchLoading ? (
                <ActivityIndicator color={colors.accentText} />
              ) : (
                <Text style={{ color: colors.accentText, fontWeight: '600' }}>{t.search || 'Search'}</Text>
              )}
            </TouchableOpacity>
          </View>

          {foundKiosk && (
            <TouchableOpacity
              style={[styles.foundKioskCard, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => onSelectKiosk(foundKiosk)}
            >
              <View style={[styles.searchResultAvatar, { backgroundColor: colors.border }]}>
                {foundKiosk.photoURL || foundKiosk.photoUrl ? (
                  <Image source={{ uri: foundKiosk.photoURL || foundKiosk.photoUrl }} style={styles.searchResultAvatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.text }]}>{(foundKiosk.name || '?').trim().charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{foundKiosk.name}</Text>
                <Text style={{ fontSize: 13, color: colors.accent, marginTop: 2 }}>{foundKiosk.mcp_id}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  </Modal>
);

export const KioskConfirmModal = ({
  visible,
  onClose,
  styles,
  colors,
  t,
  sending,
  withdrawalCode,
  selectedRecipient,
  kioskFees,
  onConfirm,
  onCloseCode,
}) => (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {!withdrawalCode ? (
          <>
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>
              {t.confirmKioskSend || 'Confirm Kiosk Send'}
            </Text>
            <Text style={{ color: colors.textSecondary, marginBottom: 16, textAlign: 'center', lineHeight: 20 }}>
              {t.sendingFundsTo || 'You are sending funds to'} {selectedRecipient?.name} ({selectedRecipient?.mcp_id}).
            </Text>

            <View style={[styles.feeBreakdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.feeLabel, { color: colors.text }]}>Amount</Text>
              <Text style={[styles.feeValue, { color: colors.text }]}>${kioskFees?.grossAmount.toFixed(2)}</Text>

              <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>{t.totalCommission || 'Total Commission'} (10%)</Text>
              <Text style={[styles.feeValue, { color: colors.text }]}>-${kioskFees?.totalFees.toFixed(2)}</Text>

              <View style={[styles.divider, { borderColor: colors.border }]} />

              <Text style={[styles.feeLabel, { color: colors.text, fontWeight: '600' }]}>{t.cashToReceive || 'Cash to Receive'}</Text>
              <Text style={[styles.feeValueLarge, { color: colors.accent }]}>${kioskFees?.clientNet.toFixed(2)}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => onClose(false)}
                disabled={sending}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: colors.accent }]}
                onPress={onConfirm}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <Text style={{ color: colors.accentText, fontWeight: '600' }}>{t.confirm || 'Confirm'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center', marginBottom: 16 }]}>
              {t.activeWithdrawalCode || 'Your Withdrawal Code'}
            </Text>
            <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.code, { color: colors.accent }]}>{withdrawalCode}</Text>
            </View>
            <Text style={{ color: colors.textSecondary, marginBottom: 24, textAlign: 'center' }}>
              {t.showCodeToAgent || 'Show this 6-digit code to the kiosk agent to receive your cash.'}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', width: '100%' }}
              onPress={onCloseCode}
            >
              <Text style={{ color: colors.accentText, fontWeight: '700', fontSize: 16 }}>{t.closeCode || 'Close Code'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  </Modal>
);

export const GuestView = ({ styles, colors, t, router }) => (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.guestContent}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.header}>
      <Text style={styles.title}>{t.sendMoney}</Text>
      <Text style={styles.subtitle}>{t.sendMoneySubtitle}</Text>
    </View>
    <View style={styles.guestCard}>
      <Ionicons name="lock-closed-outline" size={48} color={colors.muted} style={styles.guestIcon} />
      <Text style={styles.guestTitle}>{t.signInToAccessSettings}</Text>
      <Text style={styles.guestMessage}>{t.signInMessage}</Text>
      <TouchableOpacity
        style={styles.guestButton}
        onPress={() => router.push('/(app)/login')}
        activeOpacity={0.85}
      >
        <Text style={styles.guestButtonText}>{t.logIn}</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);