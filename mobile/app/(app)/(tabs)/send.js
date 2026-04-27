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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';
import { initiateTransfer } from '../../../lib/functions';

export default function SendScreen() {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const styles = createStyles(colors);

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
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUid, setSelectedUid] = useState(null);
  const [amount, setAmount] = useState('');
  const [fundingSource, setFundingSource] = useState('wallet');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mostSentUids, setMostSentUids] = useState([]);
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
    if (!user?.uid) return;
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
            limit(80)
          )
        );
        const seen = new Set();
        const uids = [];
        txSnap.forEach((d) => {
          const data = d.data();
          if (data.type === 'outgoing_transfer' && data.receiver_id && !seen.has(data.receiver_id)) {
            seen.add(data.receiver_id);
            uids.push(data.receiver_id);
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const selectedRecipient = recipients.find((r) => r.id === selectedUid);

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

          {searchLower ? (
            <View style={styles.searchResults}>
              {filteredRecipients.length === 0 ? (
                <Text style={styles.emptyText}>{t.noOneFound}</Text>
              ) : (
                filteredRecipients.map((item) => {
                  const photoUrl = item.photoURL || item.photoUrl;
                  const initial = (item.name || '?').trim().charAt(0).toUpperCase();
                  const isSelected = selectedUid === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.searchResultRow, isSelected && styles.searchResultRowSelected]}
                      onPress={() => setSelectedUid(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.searchResultAvatar, isSelected && styles.avatarSelected]}>
                        {photoUrl ? (
                          <Image source={{ uri: photoUrl }} style={styles.searchResultAvatarImage} />
                        ) : (
                          <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>{initial}</Text>
                        )}
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
                  <Text style={styles.mostSentLabel}>{t.mostSent}</Text>
                  {mostSentRecipients.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.mostSentList}
                    >
                      {mostSentRecipients.map((item) => {
                        const photoUrl = item.photoURL || item.photoUrl;
                        const initial = (item.name || '?').trim().charAt(0).toUpperCase();
                        const isSelected = selectedUid === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.mostSentAvatarWrap, isSelected && styles.mostSentAvatarWrapSelected]}
                            onPress={() => setSelectedUid(item.id)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.mostSentAvatar, isSelected && styles.avatarSelected]}>
                              {photoUrl ? (
                                <Image source={{ uri: photoUrl }} style={styles.mostSentAvatarImage} />
                              ) : (
                                <Text style={[styles.mostSentAvatarText, isSelected && styles.avatarTextSelected]}>
                                  {initial}
                                </Text>
                              )}
                            </View>
                            <Text style={[styles.mostSentName, isSelected && styles.mostSentNameSelected]} numberOfLines={1}>
                              {item.name || '—'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <Text style={styles.mostSentEmpty}>{t.mostSentEmpty}</Text>
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
      backgroundColor: colors.isDark ? 'rgba(13, 148, 136, 0.2)' : 'rgba(13, 148, 136, 0.12)',
      borderColor: colors.accent,
    },
    sourceIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.isDark ? 'rgba(13, 148, 136, 0.25)' : 'rgba(13, 148, 136, 0.15)',
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
      marginBottom: 16,
    },
    searchIcon: { marginRight: 10 },
    searchInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
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
      backgroundColor: colors.isDark ? 'rgba(13, 148, 136, 0.12)' : 'rgba(13, 148, 136, 0.08)',
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
    mostSentLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 10,
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
