import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';
import { initiateTransfer } from '../../../lib/functions';
import { initiateKioskCashOut } from '../../../lib/kiosk';

export default function SendScreen() {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const styles = createStyles(colors);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUid, setSelectedUid] = useState(null);
  const [amount, setAmount] = useState('');
  const [fundingSource, setFundingSource] = useState('wallet');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mostSentUids, setMostSentUids] = useState([]);
  const [showRecent, setShowRecent] = useState(true);

  const [kioskSearchModal, setKioskSearchModal] = useState(false);
  const [kioskSearchId, setKioskSearchId] = useState('');
  const [kioskSearchLoading, setKioskSearchLoading] = useState(false);
  const [foundKiosk, setFoundKiosk] = useState(null);
  const [kioskConfirmVisible, setKioskConfirmVisible] = useState(false);
  const [kioskFees, setKioskFees] = useState(null);
  const [withdrawalCode, setWithdrawalCode] = useState(null);

  const balance = profile?.wallet_balance ?? 0;

  const fundingSources = [
    { id: 'wallet', label: t.walletBalance, icon: 'wallet' },
    { id: 'card', label: t.debitOrCreditCard, icon: 'card' },
    { id: 'bank', label: t.bankAccount, icon: 'business' },
  ];

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredRecipients = searchLower
    ? recipients.filter(
        (r) =>
          (r.name || '').toLowerCase().includes(searchLower) ||
          (r.phone || '').replace(/\s/g, '').includes(searchLower.replace(/\s/g, ''))
      )
    : [];
  const mostSentRecipients = mostSentUids
    .map((uid) => recipients.find((r) => r.id === uid))
    .filter(Boolean);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const list = [];
        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach((d) => {
          if (d.id !== user.uid) list.push({ id: d.id, ...d.data() });
        });
        setRecipients(list);
      } catch (e) {
        Alert.alert(t.error, e?.message || t.errLoadRecipients);
        setRecipients([]);
      }

      try {
        const txSnap = await getDocs(
          query(
            collection(db, 'users', user.uid, 'transactions'),
            where('status', '==', 'completed'),
            orderBy('timestamp', 'desc'),
            limit(200)
          )
        );
        const seen = new Set();
        const uids = [];
        txSnap.forEach((d) => {
          const data = d.data();
          if (data.type === 'outgoing_transfer' && data.receiver_id && !seen.has(data.receiver_id)) {
            seen.add(data.receiver_id);
            uids.push(data.receiver_id);
          } else if (data.type === 'kiosk_withdrawal' && data.metadata?.mcp_uid && !seen.has(data.metadata.mcp_uid)) {
            seen.add(data.metadata.mcp_uid);
            uids.push(data.metadata.mcp_uid);
          }
        });
        setMostSentUids(uids);
      } catch {
        setMostSentUids([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  const selectedRecipient = recipients.find((r) => r.id === selectedUid);
  const isKiosk = String(selectedRecipient?.role || '').toLowerCase() === 'mcp' || !!selectedRecipient?.mcp_id;

  const handleSearchKiosk = async () => {
    if (!kioskSearchId.trim()) return;
    setKioskSearchLoading(true);
    setFoundKiosk(null);
    try {
      const searchStr = kioskSearchId.trim().toUpperCase().replace('MCP', '');
      const q = query(collection(db, 'users'), where('role', '==', 'mcp'));
      const snap = await getDocs(q);
      
      const doc = snap.docs.find((d) => {
        const mcpId = d.data().mcp_id;
        return mcpId && mcpId.toUpperCase().includes(searchStr);
      });

      if (!doc) {
        Alert.alert(t.error, t.kioskNotFound || 'Kiosk not found');
      } else {
        setFoundKiosk({ id: doc.id, ...doc.data() });
      }
    } catch (e) {
      Alert.alert(t.error, e.message);
    } finally {
      setKioskSearchLoading(false);
    }
  };

  async function confirmKioskSend() {
    setSending(true);
    try {
      const num = parseFloat(amount);
      const result = await initiateKioskCashOut(num, selectedUid);
      if (result.success) {
        setWithdrawalCode(result.withdrawal_code);
      }
    } catch (err) {
      Alert.alert(t.error, err.message || 'Failed to initiate withdrawal');
      setKioskConfirmVisible(false);
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    const num = parseFloat(amount);
    if (!selectedUid || !num || num <= 0) {
      Alert.alert(t.error, t.errSelectRecipient);
      return;
    }
    if (fundingSource === 'wallet' && num > balance) {
      Alert.alert(t.error, t.errInsufficientWallet);
      return;
    }

    if (isKiosk) {
      if (fundingSource !== 'wallet') {
        Alert.alert(t.error, t.errKioskWalletOnly || 'Kiosk withdrawals must be funded from your Wallet balance.');
        return;
      }
      const totalFees = num * 0.10;
      const clientNet = num - totalFees;
      setKioskFees({
        grossAmount: num,
        totalFees,
        clientNet,
      });
      setKioskConfirmVisible(true);
      return;
    }

    setSending(true);
    try {
      await initiateTransfer(selectedUid, num, fundingSource);
      Alert.alert(
        t.success,
        fundingSource === 'wallet' ? t.successTransferWallet : t.successTransferExternal
      );
      setAmount('');
      setSelectedUid(null);
    } catch (e) {
      Alert.alert(t.error, e.message || t.errTransferFailed);
    } finally {
      setSending(false);
    }
  }

  const handleCloseKioskCode = () => {
    Alert.alert(
      t.confirmCloseCodeTitle || 'Close Code?',
      t.confirmCloseCodeMsg || 'Are you sure you want to close this? Make sure the kiosk agent has scanned your code first.',
      [
        { text: t.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.close || 'Close',
          style: 'destructive',
          onPress: () => {
            setKioskConfirmVisible(false);
            setWithdrawalCode(null);
            setAmount('');
            setSelectedUid(null);
          },
        },
      ]
    );
  };

  if (!user) {
    return (
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
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.sendMoney}</Text>
          <Text style={styles.subtitle}>{t.sendMoneySubtitle}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.amount}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!sending}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.sendTo}</Text>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={20} color={colors.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.kioskRow}>
            <TouchableOpacity
              style={[styles.sendToKioskBtn, { marginBottom: 0 }]}
              onPress={() => {
                setKioskSearchId('');
                setFoundKiosk(null);
                setKioskSearchModal(true);
              }}
            >
              <Ionicons name="storefront-outline" size={20} color={colors.accent} />
              <Text style={[styles.sendToKioskText, { color: colors.accent }]} numberOfLines={1}>
                {t.sendToKiosk || 'Send to Kiosk'}
              </Text>
            </TouchableOpacity>

            {isKiosk && selectedRecipient && (
              <View style={[styles.selectedKioskBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
                  {selectedRecipient.name || selectedRecipient.mcp_id}
                </Text>
                <TouchableOpacity onPress={() => setSelectedUid(null)} hitSlop={12} style={{ marginLeft: 6 }}>
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {searchLower ? (
            <View style={styles.searchResults}>
              {filteredRecipients.length === 0 ? (
                <Text style={styles.emptyText}>{t.noOneFound}</Text>
              ) : (
                filteredRecipients.map((item) => {
                  const isSelected = selectedUid === item.id;
                  const isResultMcp = String(item.role || '').toLowerCase() === 'mcp' || !!item.mcp_id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.searchResultRow, isSelected && styles.searchResultRowSelected]}
                      onPress={() => setSelectedUid(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.searchResultAvatar, isSelected && styles.avatarSelected]}>
                        <Ionicons 
                          name={isResultMcp ? 'storefront-outline' : 'person-outline'} 
                          size={20} 
                          color={isSelected ? colors.accentText : colors.muted} 
                        />
                      </View>
                      <View style={styles.searchResultInfo}>
                        <Text style={[styles.searchResultName, isSelected && styles.recipientNameSelected]} numberOfLines={1}>
                          {item.name || t.noName}
                        </Text>
                        <Text style={styles.searchResultPhone} numberOfLines={1}>{item.phone || ''}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.accent} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          ) : (
            <>
              {recipients.length > 0 && (
                <>
                  <View style={styles.recentHeaderRow}>
                    <Text style={styles.mostSentLabel}>{t.recentlySent || 'Recently sent'}</Text>
                    <TouchableOpacity onPress={() => setShowRecent(!showRecent)} hitSlop={12}>
                      <Text style={styles.toggleRecentText}>{showRecent ? (t.hide || 'Hide') : (t.show || 'Show')}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {showRecent && (
                    mostSentRecipients.length > 0 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.mostSentList}
                      >
                        {mostSentRecipients.map((item) => {
                          const isSelected = selectedUid === item.id;
                          const isRecentMcp = String(item.role || '').toLowerCase() === 'mcp' || !!item.mcp_id;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[styles.mostSentAvatarWrap, isSelected && styles.mostSentAvatarWrapSelected]}
                              onPress={() => setSelectedUid(item.id)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.mostSentAvatar, isSelected && styles.avatarSelected]}>
                                <Ionicons 
                                  name={isRecentMcp ? 'storefront-outline' : 'person-outline'} 
                                  size={24} 
                                  color={isSelected ? colors.accentText : colors.muted} 
                                />
                              </View>
                              {!isSelected && (
                                <Text style={styles.mostSentName} numberOfLines={1}>
                                  {item.name || item.mcp_id || '—'}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    ) : (
                      <Text style={styles.mostSentEmpty}>{t.recentlySentEmpty || 'Send money to see your recent contacts here.'}</Text>
                    )
                  )}
                </>
              )}
              {recipients.length === 0 && (
                <Text style={styles.emptyText}>{t.noContacts}</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.payFrom}</Text>
          <View style={styles.sourceRow}>
            {fundingSources.map((src) => (
              <TouchableOpacity
                key={src.id}
                style={[styles.sourceChip, fundingSource === src.id && styles.sourceChipSelected]}
                onPress={() => setFundingSource(src.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.sourceIconWrap, fundingSource === src.id && styles.sourceIconWrapSelected]}>
                  <Ionicons
                    name={src.icon}
                    size={22}
                    color={fundingSource === src.id ? colors.accentText : colors.accent}
                  />
                </View>
                <Text style={[styles.sourceChipText, fundingSource === src.id && styles.sourceChipTextSelected]} numberOfLines={2}>
                  {src.label}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.availableChip}>
              <Ionicons name="wallet-outline" size={22} color={colors.accent} style={styles.availableIcon} />
              <Text style={styles.availableLabel}>{t.available}</Text>
              <Text style={styles.availableAmount}>$ {balance.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, sending && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <>
              <Ionicons name="paper-plane" size={22} color={colors.accentText} style={styles.buttonIcon} />
              <Text style={styles.buttonText} numberOfLines={1}>
                {selectedRecipient && amount && parseFloat(amount) > 0
                  ? `${t.tabSend} $${parseFloat(amount).toFixed(2)} → ${(selectedRecipient.name || 'recipient').split(' ')[0]}`
                  : t.sendMoney}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Kiosk Search Modal */}
      <Modal
        visible={kioskSearchModal}
        animationType="slide"
        transparent
        onRequestClose={() => setKioskSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t.findKiosk || 'Find Kiosk'}</Text>
                <TouchableOpacity onPress={() => setKioskSearchModal(false)} hitSlop={12}>
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
                  onPress={() => {
                    if (!recipients.find(r => r.id === foundKiosk.id)) {
                      setRecipients([foundKiosk, ...recipients]);
                    }
                    setSelectedUid(foundKiosk.id);
                    setFundingSource('wallet');
                    setKioskSearchModal(false);
                    setFoundKiosk(null);
                    setKioskSearchId('');
                  }}
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

      {/* Kiosk Confirmation Modal */}
      <Modal
        visible={kioskConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!withdrawalCode) setKioskConfirmVisible(false);
          else handleCloseKioskCode();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {!withdrawalCode ? (
              <>
                <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>{t.confirmKioskSend || 'Confirm Kiosk Send'}</Text>
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
                    onPress={() => setKioskConfirmVisible(false)}
                    disabled={sending}
                  >
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{t.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmActionBtn, { backgroundColor: colors.accent }]}
                    onPress={confirmKioskSend}
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
                <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center', marginBottom: 16 }]}>{t.activeWithdrawalCode || 'Your Withdrawal Code'}</Text>
                <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.code, { color: colors.accent }]}>{withdrawalCode}</Text>
                </View>
                <Text style={{ color: colors.textSecondary, marginBottom: 24, textAlign: 'center' }}>
                  {t.showCodeToAgent || 'Show this 6-digit code to the kiosk agent to receive your cash.'}
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: colors.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', width: '100%' }}
                  onPress={handleCloseKioskCode}
                >
                  <Text style={{ color: colors.accentText, fontWeight: '700', fontSize: 16 }}>{t.closeCode || 'Close Code'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    centered: { justifyContent: 'center' },
    content: { padding: 24, paddingTop: 56, paddingBottom: 40 },
    header: { marginBottom: 28 },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 6,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 16,
    },
    sourceRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 17,
      justifyContent: 'center',
    },
    sourceChip: {
      width: 115,
      height: 115,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    sourceChipSelected: {
      backgroundColor: colors.isDark ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.12)',
      borderColor: colors.accent,
    },
    sourceIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.isDark ? 'rgba(234, 179, 8, 0.25)' : 'rgba(234, 179, 8, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    sourceIconWrapSelected: { backgroundColor: colors.accent },
    sourceChipText: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
    sourceChipTextSelected: { color: colors.accent },
    availableChip: {
      width: 115,
      height: 115,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.border,
    },
    availableIcon: { marginBottom: 6 },
    availableLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    availableAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.accent,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      fontStyle: 'italic',
      paddingVertical: 12,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      marginBottom: 10,
    },
    searchIcon: { marginRight: 10 },
    searchInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    sendToKioskBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginBottom: 16,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.1)',
      maxWidth: '100%',
    },
    sendToKioskText: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: '600',
      flexShrink: 1,
    },
    kioskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      flexWrap: 'wrap',
      gap: 10,
    },
    selectedKioskBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      flexShrink: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      padding: 24,
      borderRadius: 16,
      borderWidth: 1,
    },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    modalInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
    },
    searchBtn: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      borderRadius: 12,
    },
    foundKioskCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 8,
    },
    feeBreakdown: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    feeLabel: { fontSize: 13, marginTop: 8 },
    feeValue: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    feeValueLarge: { fontSize: 24, fontWeight: 'bold' },
    divider: { borderTopWidth: 1, marginVertical: 12 },
    confirmActionBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    codeBox: { padding: 24, borderRadius: 12, borderWidth: 2, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
    code: { fontSize: 40, fontWeight: 'bold', letterSpacing: 4 },
    searchResults: { marginTop: 4 },
    searchResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderRadius: 12,
      marginBottom: 4,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    searchResultRowSelected: {
      backgroundColor: colors.isDark ? 'rgba(234, 179, 8, 0.12)' : 'rgba(234, 179, 8, 0.08)',
      borderColor: colors.accent,
    },
    searchResultAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      overflow: 'hidden',
    },
    searchResultAvatarImage: { width: '100%', height: '100%' },
    searchResultInfo: { flex: 1 },
    searchResultName: { fontSize: 16, fontWeight: '600', color: colors.text },
    searchResultPhone: { fontSize: 13, color: colors.muted, marginTop: 2 },
    recipientNameSelected: { color: colors.accent },
    avatarSelected: { backgroundColor: colors.accent },
    avatarText: { fontSize: 18, fontWeight: '700', color: colors.text },
    avatarTextSelected: { color: colors.accentText },
    recentHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    toggleRecentText: {
      fontSize: 13,
      color: colors.accent,
      fontWeight: '600',
    },
    mostSentLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    mostSentList: { flexDirection: 'row', gap: 14, paddingVertical: 4 },
    mostSentAvatarWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      borderRadius: 28,
    },
    mostSentAvatarWrapSelected: { borderColor: colors.accent },
    mostSentAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    mostSentAvatarImage: { width: '100%', height: '100%' },
    mostSentAvatarText: { fontSize: 20, fontWeight: '700', color: colors.text },
    mostSentName: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      marginTop: 6,
      maxWidth: 64,
      textAlign: 'center',
    },
    mostSentNameSelected: { color: colors.accent },
    mostSentEmpty: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginTop: 8,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingLeft: 20,
    },
    currencySymbol: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textSecondary,
      marginRight: 4,
    },
    input: {
      flex: 1,
      paddingVertical: 20,
      paddingHorizontal: 8,
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 24,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 4,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonIcon: { marginRight: 10 },
    buttonText: { fontSize: 17, fontWeight: '700', color: colors.accentText },
    guestContent: {
      flexGrow: 1,
      padding: 24,
      paddingTop: 56,
      paddingBottom: 40,
    },
    guestCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: 'center',
      marginTop: 8,
    },
    guestIcon: { marginBottom: 16 },
    guestTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
      textAlign: 'center',
    },
    guestMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    guestButton: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 14,
    },
    guestButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.accentText,
    },
  });
}
