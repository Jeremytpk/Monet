import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../lib/ThemeContext';
import { useAuth } from '../../../lib/useAuth';
import { useLanguage } from '../../../lib/LanguageContext';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { confirmKioskCashOut } from '../../../lib/kiosk';

export default function McpDashboard() {
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [mpaAccount, setMpaAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [withdrawalCode, setWithdrawalCode] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [showCodeScanner, setShowCodeScanner] = useState(false);
  const [lastConfirmation, setLastConfirmation] = useState(null);

  const uid = user?.uid || '';
  
  // Create refs only if uid is valid
  const mpaRef = uid ? doc(db, 'mpa_accounts', uid) : null;
  const txQuery = uid ? query(
    collection(db, 'mpa_accounts', uid, 'transactions'),
    orderBy('timestamp', 'desc')
  ) : null;

  // Load MPA account
  useEffect(() => {
    if (!uid || !mpaRef) return;
    (async () => {
      try {
        const snap = await getDoc(mpaRef);
        if (snap.exists) setMpaAccount(snap.data());
      } catch (err) {
        console.error('Error loading MPA account:', err);
      }
    })();
  }, [uid, mpaRef]);

  // Listen to transactions
  useEffect(() => {
    if (!uid || !txQuery) return;
    const unsub = onSnapshot(txQuery, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [uid, txQuery]);

  const handleScanWithdrawal = async () => {
    if (!withdrawalCode.trim()) {
      Alert.alert(t.required || 'Required', t.errCodeRequiredMsg);
      return;
    }

    setConfirmLoading(true);
    try {
      const result = await confirmKioskCashOut(withdrawalCode);
      if (result.success) {
        setLastConfirmation(result);
        Alert.alert(
          t.success,
          `${t.amountSent || 'Amount Sent'}: $${result.gross_amount.toFixed(2)}\n` +
          `${t.monetCommission || 'Monet Commission'} (3%): $${result.monet_commission.toFixed(2)}\n` +
          `${t.yourCommission || 'Your Commission'} (7%): $${result.mcp_commission.toFixed(2)}\n\n` +
          `${t.cashHandedLabel || 'Cash to Hand Over'}: $${result.client_net.toFixed(2)}`
        );
        setWithdrawalCode('');
        setShowCodeScanner(false);
      }
    } catch (err) {
      Alert.alert(t.error, err.message || 'Failed to confirm withdrawal');
    } finally {
      setConfirmLoading(false);
    }
  };

  // Check if user has 'mcp' role (case-insensitive)
  const isMcp = profile && String(profile.role || '').toLowerCase() === 'mcp';

  // Return null if user is not MCP
  if (!profile || !isMcp) return null;

  // SIMULATION: Always treat MCP as active regardless of $250 requirement
  const isMcpActive = true; // (profile?.wallet_balance || 0) >= 250;
  const statusColor = isMcpActive ? colors.success || '#4CAF50' : colors.error || '#F44336';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>MONET</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {mpaAccount?.business_name || t.mcpSubtitle}{profile?.mcp_id ? ` - ${profile.mcp_id}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')} style={styles.settingsButton} hitSlop={12}>
          <Ionicons name="settings-outline" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Wallet Balance Card */}
      <View
        style={[
          styles.balanceCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 2,
            marginBottom: 0,
          },
        ]}
      >
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
          {t.walletBalance || 'Wallet Balance'}
        </Text>
        <Text style={[styles.balanceAmount, { color: colors.text }]}>
          ${(profile?.wallet_balance || 0).toFixed(2)}
        </Text>
      </View>

      {/* MPA Balance Card */}
      <View
        style={[
          styles.balanceCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 2,
          },
        ]}
      >
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
            {t.mpaBalance}
          </Text>
          <Text style={[styles.balanceAmount, { color: colors.accent }]}>
            ${(mpaAccount?.balance || 0).toFixed(2)}
          </Text>
        </View>

        {/* Status Indicator */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + '20', borderColor: statusColor },
          ]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: statusColor }]}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isMcpActive
              ? t.mcpActive
              : t.mcpInactive}
          </Text>
        </View>

        {/* Commission Earned */}
        <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={[styles.commissionLabel, { color: colors.textSecondary }]}>
            {t.totalCommissionsEarned}
          </Text>
          <Text style={[styles.commissionAmount, { color: colors.accent }]}>
            ${(mpaAccount?.total_commissions_earned || 0).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Scan Withdrawal Code Button */}
      <View style={{ paddingHorizontal: 16, marginVertical: 20 }}>
        <TouchableOpacity
          onPress={() => setShowCodeScanner(true)}
          style={[
            styles.scanButton,
            {
              backgroundColor: colors.accent,
              opacity: isMcpActive ? 1 : 0.5,
            },
          ]}
          disabled={!isMcpActive}
        >
          <Text style={[styles.scanButtonText, { color: colors.accentText }]}>
            {t.scanWithdrawalCode}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Last Confirmation Result */}
      {lastConfirmation && (
        <View
          style={[
            styles.confirmationResult,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.confirmationTitle, { color: colors.accent }]}>
            {t.lastTransaction}
          </Text>
          <Text style={[styles.confirmationDetail, { color: colors.text }]}>
            {t.amountSent || 'Amount Sent'}: ${lastConfirmation.gross_amount.toFixed(2)}
          </Text>
          <Text style={[styles.confirmationDetail, { color: colors.text }]}>
            {t.monetCommission || 'Monet Commission'}: ${lastConfirmation.monet_commission.toFixed(2)}
          </Text>
          <Text style={[styles.confirmationDetail, { color: colors.text }]}>
            {t.yourCommission || 'Your Commission'}: ${lastConfirmation.mcp_commission.toFixed(2)}
          </Text>
          <Text style={[styles.confirmationDetail, { color: colors.text, fontWeight: 'bold', marginTop: 4 }]}>
            {t.cashHandedLabel || 'Cash Handed'}: ${lastConfirmation.client_net.toFixed(2)}
          </Text>
        </View>
      )}

      {/* Transaction History */}
      <View style={{ paddingHorizontal: 16, marginVertical: 20 }}>
        <Text style={[styles.historyTitle, { color: colors.text }]}>
          {t.transactionHistory}
        </Text>
        {transactions.length === 0 ? (
          <Text style={[styles.noData, { color: colors.textSecondary }]}>
            {t.noTransactionsYet}
          </Text>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.txRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txType, { color: colors.text }]}>
                    {item.type === 'kiosk_commission' ? t.kioskCommission : t.deposit}
                  </Text>
                  <Text style={[styles.txTime, { color: colors.textSecondary }]}>
                    {item.timestamp?.toDate?.()?.toLocaleDateString() || 'N/A'}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: colors.accent }]}>
                  +${(item.commission_earned || item.amount || 0).toFixed(2)}
                </Text>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </View>

      {/* Scan Modal */}
      <Modal visible={showCodeScanner} animationType="slide">
        <View style={[styles.scanModal, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            onPress={() => setShowCodeScanner(false)}
            style={styles.scanCloseButton}
          >
            <Text style={[styles.scanCloseText, { color: colors.accent }]}>✕</Text>
          </TouchableOpacity>

          <View style={styles.scanContent}>
            <Text style={[styles.scanTitle, { color: colors.text }]}>
              {t.enterWithdrawalCode}
            </Text>
            <Text style={[styles.scanSubtitle, { color: colors.textSecondary }]}>
              {t.withdrawalCodeSubtitle}
            </Text>

            <TextInput
              placeholder="000000"
              placeholderTextColor={colors.textSecondary}
              value={withdrawalCode}
              onChangeText={(text) => setWithdrawalCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              style={[
                styles.codeInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />

            <TouchableOpacity
              onPress={handleScanWithdrawal}
              disabled={confirmLoading || withdrawalCode.length !== 6}
              style={[
                styles.confirmButton,
                {
                  backgroundColor: colors.accent,
                  opacity: confirmLoading || withdrawalCode.length !== 6 ? 0.5 : 1,
                },
              ]}
            >
              {confirmLoading ? (
                <ActivityIndicator color={colors.accentText} />
              ) : (
                <Text style={[styles.confirmButtonText, { color: colors.accentText }]}>
                  {t.confirmHandOverCash}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 37 : 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  settingsButton: { padding: 8 },
  balanceCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 20,
    borderRadius: 12,
  },
  balanceLabel: { fontSize: 12, marginBottom: 4 },
  balanceAmount: { fontSize: 36, fontWeight: 'bold' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  commissionLabel: { fontSize: 12, marginBottom: 4 },
  commissionAmount: { fontSize: 24, fontWeight: 'bold' },
  scanButton: {
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonText: { fontSize: 16, fontWeight: '600' },
  confirmationResult: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  confirmationTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  confirmationDetail: { fontSize: 13, marginVertical: 2 },
  historyTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  noData: { fontSize: 14, textAlign: 'center', marginVertical: 20 },
  txRow: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  txType: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  txTime: { fontSize: 12 },
  txAmount: { fontSize: 16, fontWeight: 'bold' },
  scanModal: { flex: 1 },
  scanCloseButton: { alignSelf: 'flex-end', padding: 16 },
  scanCloseText: { fontSize: 24, fontWeight: 'bold' },
  scanContent: { paddingHorizontal: 16, paddingVertical: 24, flex: 1, justifyContent: 'center' },
  scanTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  scanSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  codeInput: {
    height: 80,
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 32,
  },
  confirmButton: {
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: { fontSize: 16, fontWeight: '600' },
});
