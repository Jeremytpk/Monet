import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, limit, getDocs, onSnapshot, where } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '../../../lib/firebase';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';

export default function ActivityScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const styles = createStyles(colors);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingKiosk, setPendingKiosk] = useState(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [authAction, setAuthAction] = useState(null); // 'pending' | 'details'

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'transactions'),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setTransactions(list);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }

      // Real-time listener for any pending kiosk withdrawal code
      const qPending = query(
        collection(db, 'kiosk_transactions'),
        where('user_uid', '==', user.uid),
        where('status', '==', 'pending')
      );
      const unsubPending = onSnapshot(qPending, (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const valid = docs.find(d => {
            const exp = d.expires_at?.toDate?.() || new Date(0);
            return exp.getTime() > Date.now();
          });
          setPendingKiosk(valid || null);
          if (!valid) setCodeModalVisible(false);
        } else {
          setPendingKiosk(null);
          setCodeModalVisible(false);
        }
      });
      return () => unsubPending();
    })();
  }, [user?.uid]);

  function formatDate(ts) {
    if (!ts?.toDate) return '—';
    const d = ts.toDate();
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async function handleVerifyPassword() {
    if (!passwordInput) return;
    setVerifying(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, passwordInput);
      await reauthenticateWithCredential(auth.currentUser, credential);
      setPasswordModalVisible(false);
      setPasswordInput('');
      if (authAction === 'pending') {
        setCodeModalVisible(true);
      } else if (authAction === 'details') {
        setDetailsModalVisible(true);
      }
    } catch (e) {
      Alert.alert(t.error, t.authFailed || 'Verification failed. Incorrect password.');
    } finally {
      setVerifying(false);
    }
  }

  function getTxTypeLabel(type) {
    switch (type) {
      case 'incoming_transfer': return t.txTypeIncoming || 'Incoming Transfer';
      case 'outgoing_transfer': return t.txTypeOutgoing || 'Outgoing Transfer';
      case 'deposit': return t.deposit || 'Deposit';
      case 'withdrawal': return t.withdrawal || 'Withdrawal';
      case 'kiosk_withdrawal': return t.txTypeKioskWithdrawal || 'Kiosk Withdrawal';
      default: return String(type || '').replace('_', ' ');
    }
  }

  if (!user) {
    return <GuestPrompt colors={colors} t={t} router={router} />;
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.recentActivity}</Text>
        <Text style={styles.subtitle}>{t.moneyInOut}</Text>
      </View>
      <FlatList
        data={transactions}
        keyExtractor={(tx) => tx.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          pendingKiosk ? (
            <TouchableOpacity
              style={[styles.row, { borderColor: colors.accent, borderWidth: 2 }]}
              onPress={() => { setAuthAction('pending'); setPasswordModalVisible(true); }}
            >
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.accent }]}>{t.pendingKioskWithdrawal}</Text>
                <Text style={styles.rowDate}>{t.tapToViewCode}</Text>
              </View>
              <Ionicons name="lock-closed" size={20} color={colors.accent} />
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{t.noTransactions}</Text>
        }
        renderItem={({ item }) => {
          const isIn = item.type === 'incoming_transfer' || item.type === 'deposit';
          const isOut = item.type === 'withdrawal' || item.type === 'kiosk_withdrawal';
          const amount = item.amount ?? 0;
          const label = isOut ? t.withdrawal : isIn ? t.received : t.transfer;
          return (
            <TouchableOpacity 
              style={styles.row}
              onPress={() => { setSelectedTx(item); setAuthAction('details'); setPasswordModalVisible(true); }}
              activeOpacity={0.7}
            >
              <View style={[styles.dot, isIn ? styles.dotIn : styles.dotOut]} />
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowDate}>{formatDate(item.timestamp)}</Text>
              </View>
              <Text style={[styles.rowAmount, isIn ? styles.amountIn : styles.amountOut]}>
                {isIn ? '+' : '-'} ${amount.toFixed(2)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Verify Password Modal */}
      <Modal visible={passwordModalVisible} transparent animationType="fade" onRequestClose={() => {
        setPasswordModalVisible(false);
        setPasswordInput('');
        setAuthAction(null);
        setSelectedTx(null);
      }}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t.enterPasswordToView}</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder={t.password}
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
                autoCapitalize="none"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalButtonCancel} onPress={() => { 
                  setPasswordModalVisible(false); 
                  setPasswordInput(''); 
                  setAuthAction(null);
                  setSelectedTx(null);
                }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButtonConfirm, { backgroundColor: colors.accent }]} onPress={handleVerifyPassword} disabled={verifying}>
                  {verifying ? (
                    <ActivityIndicator color={colors.accentText} />
                  ) : (
                    <Text style={{ color: colors.accentText, fontWeight: '600' }}>{t.verify}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Reveal Code Modal */}
      <Modal visible={codeModalVisible} transparent animationType="slide" onRequestClose={() => setCodeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 8 }]}>{t.activeWithdrawalCode}</Text>
            <Text style={{ color: colors.textSecondary, marginBottom: 24, textAlign: 'center' }}>
              Show this 6-digit code to the kiosk agent to receive your cash.
            </Text>
            
            <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.codeText, { color: colors.accent }]}>{pendingKiosk?.code}</Text>
            </View>
            
            <TouchableOpacity style={[styles.modalButtonConfirm, { backgroundColor: colors.accent, width: '100%', alignItems: 'center' }]} onPress={() => setCodeModalVisible(false)}>
              <Text style={{ color: colors.accentText, fontWeight: '600' }}>{t.ok || 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Transaction Details Modal */}
      <Modal visible={detailsModalVisible} transparent animationType="slide" onRequestClose={() => setDetailsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>{t.transactionDetails || 'Transaction Details'}</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <View style={{ gap: 12, marginBottom: 24 }}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t.txType || 'Type'}</Text>
                  <Text style={[styles.detailValue, { color: colors.text, textTransform: 'capitalize' }]}>{getTxTypeLabel(selectedTx.type)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t.txDate || 'Date'}</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedTx.timestamp)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t.txStatus || 'Status'}</Text>
                  <Text style={[styles.detailValue, { color: colors.text, textTransform: 'capitalize' }]}>{selectedTx.status}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t.amount || 'Amount'}</Text>
                  <Text style={[styles.detailValue, { color: colors.text, fontWeight: 'bold' }]}>${(selectedTx.amount || 0).toFixed(2)}</Text>
                </View>

                {selectedTx.metadata?.fees != null && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t.txFees || 'Fees'}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>${Number(selectedTx.metadata.fees).toFixed(2)}</Text>
                  </View>
                )}

                {selectedTx.metadata?.mcp_name && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t.mcpName || 'Kiosk Name'}</Text>
                    <Text style={[styles.detailValue, { color: colors.text, fontWeight: 'bold' }]}>{selectedTx.metadata.mcp_name}</Text>
                  </View>
                )}

                {selectedTx.metadata?.withdrawal_code && (
                  <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 12, padding: 16, marginBottom: 0 }]}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 14 }}>{t.txCode || 'Withdrawal Code'}</Text>
                    <Text style={[styles.codeText, { color: colors.accent, fontSize: 32 }]}>{selectedTx.metadata.withdrawal_code}</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={[styles.modalButtonConfirm, { backgroundColor: colors.accent, width: '100%', alignItems: 'center' }]} onPress={() => setDetailsModalVisible(false)}>
              <Text style={{ color: colors.accentText, fontWeight: '600' }}>{t.ok || 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

function GuestPrompt({ colors, t, router }) {
  const styles = createStyles(colors);
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.guestContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t.tabActivity}</Text>
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

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { justifyContent: 'center' },
    header: { padding: 24, paddingTop: 56 },
    title: { fontSize: 28, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
    list: { padding: 24, paddingTop: 16 },
    empty: { color: colors.muted, fontSize: 16, textAlign: 'center', marginTop: 32 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 14 },
    dotIn: { backgroundColor: '#22C55E' },
    dotOut: { backgroundColor: colors.accent },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
    rowDate: { fontSize: 13, color: colors.muted, marginTop: 2 },
    rowAmount: { fontSize: 17, fontWeight: '700' },
    amountIn: { color: '#22C55E' },
    amountOut: { color: colors.text },
    guestContent: {
      flexGrow: 1,
      padding: 24,
      paddingTop: 56,
    },
    guestCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: 'center',
      marginTop: 24,
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalCard: { padding: 24, borderRadius: 16, borderWidth: 1 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
    modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalButtonCancel: { paddingVertical: 12, paddingHorizontal: 20, justifyContent: 'center' },
    modalButtonConfirm: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, justifyContent: 'center' },
    codeBox: { padding: 24, borderRadius: 12, borderWidth: 2, marginBottom: 24, alignItems: 'center', justifyContent: 'center', width: '100%' },
    codeText: { fontSize: 40, fontWeight: 'bold', letterSpacing: 4 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { fontSize: 14 },
    detailValue: { fontSize: 15, fontWeight: '500' },
  });
}
