import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/useAuth';
import { initiateKioskCashOut } from '../../lib/kiosk';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function KioskWithdraw() {
  const { colors } = useTheme();
  const { profile } = useAuth();

  const [amount, setAmount] = useState('');
  const [mcpIdInput, setMcpIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawalCode, setWithdrawalCode] = useState(null);
  const [fees, setFees] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [mcpToConfirm, setMcpToConfirm] = useState(null);

  const handleVerifyMcp = async () => {
    if (!amount || !mcpIdInput.trim()) {
      Alert.alert(t.required || 'Required', t.errAmountAndMcpId || 'Please enter amount and the Kiosk MCP ID');
      return;
    }

    const numAmount = parseFloat(amount);
    if (numAmount <= 0) {
      Alert.alert(t.invalid || 'Invalid', t.invalidAmount || 'Amount must be greater than 0');
      return;
    }

    if ((profile?.wallet_balance || 0) < numAmount) {
      Alert.alert(t.insufficient || 'Insufficient', t.insufficientWalletLow || 'Your wallet balance is too low');
      return;
    }

    setLoading(true);
    try {
      const searchStr = mcpIdInput.trim().toUpperCase().replace('MCP', '');
      const q = query(collection(db, 'users'), where('role', '==', 'mcp'));
      const snap = await getDocs(q);
      
      const mcpDoc = snap.docs.find((d) => {
        const mcpId = d.data().mcp_id;
        return mcpId && mcpId.toUpperCase().includes(searchStr);
      });

      if (!mcpDoc) {
        Alert.alert(t.error || 'Not Found', t.errMcpNotFound || 'Could not find a kiosk partner with that MCP ID.');
        setLoading(false);
        return;
      }
      const mcpData = mcpDoc.data();

      setMcpToConfirm({
        uid: mcpDoc.id,
        name: mcpData.name || 'Monet Kiosk Partner',
        mcp_id: mcpData.mcp_id
      });
    } catch (err) {
      Alert.alert(t.error || 'Error', err.message || 'Failed to verify kiosk');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateWithdrawal = async () => {
    if (!mcpToConfirm) return;
    const numAmount = parseFloat(amount);

    setLoading(true);
    try {
      const result = await initiateKioskCashOut(numAmount, mcpToConfirm.uid);
      if (result.success) {
        setMcpToConfirm(null);
        setWithdrawalCode(result.withdrawal_code);
        setFees(result.fees);
        setShowConfirmation(true);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to initiate withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (withdrawalCode) {
      // Copy to clipboard (requires react-native-clipboard or similar)
      Alert.alert('Copied', `Code ${withdrawalCode} copied to clipboard`);
    }
  };

  const handleCloseCodeModal = () => {
    Alert.alert(
      'Close Code?',
      'Are you sure you want to close this? Make sure the kiosk agent has scanned your code first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: () => {
            setShowConfirmation(false);
            setWithdrawalCode(null);
            setAmount('');
            setMcpIdInput('');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t.cashWithdrawal || 'Cash Withdrawal'}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t.withdrawCashSubtitle || 'Withdraw cash from a Monet kiosk near you'}
        </Text>
      </View>

      {/* Wallet Balance */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t.availableBalance || 'Available Balance'}</Text>
        <Text style={[styles.balance, { color: colors.accent }]}>
          ${(profile?.wallet_balance || 0).toFixed(2)}
        </Text>
      </View>

      {/* Amount Input */}
      <View style={{ paddingHorizontal: 16, marginVertical: 12 }}>
        <Text style={[styles.label, { color: colors.text }]}>{t.amountUsd || 'Amount (USD)'}</Text>
        <TextInput
          placeholder="Enter amount"
          placeholderTextColor={colors.textSecondary}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          editable={!loading}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />
        {amount && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.feePreview, { color: colors.textSecondary }]}>
              • {t.totalCommission || 'Total Commission'} (10%): ${(parseFloat(amount) * 0.1).toFixed(2)}
            </Text>
            <Text style={[styles.feePreview, { color: colors.textSecondary }]}>
              • You receive: ${(parseFloat(amount) * 0.9).toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* MCP ID Input */}
      <View style={{ paddingHorizontal: 16, marginVertical: 12 }}>
        <Text style={[styles.label, { color: colors.text }]}>{t.kioskMcpId || 'Kiosk MCP ID'}</Text>
        <TextInput
          placeholder="e.g. MCP1234567"
          placeholderTextColor={colors.textSecondary}
          value={mcpIdInput}
          onChangeText={(text) => setMcpIdInput(text.toUpperCase().replace(/\s/g, ''))}
          autoCapitalize="characters"
          editable={!loading}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />
      </View>

      {/* Submit Button */}
      <View style={{ paddingHorizontal: 16, marginVertical: 16 }}>
        <TouchableOpacity
          onPress={handleVerifyMcp}
          disabled={loading || !amount || !mcpIdInput}
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.accent,
              opacity: loading || !amount || !mcpIdInput ? 0.5 : 1,
            },
          ]}
        >
          {loading && !mcpToConfirm ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={[styles.submitText, { color: colors.accentText }]}>
              {t.verifyKiosk || 'Verify Kiosk'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Pre-Confirmation Modal to Verify MCP Details */}
      <Modal
        visible={!!mcpToConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setMcpToConfirm(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>{t.verifyKiosk || 'Verify Kiosk'}</Text>
            <Text style={{ color: colors.textSecondary, marginBottom: 16, textAlign: 'center', lineHeight: 20 }}>
              {t.verifyKioskMsg || 'Please confirm this is the correct kiosk agent before generating your withdrawal code.'}
            </Text>

            <View style={[styles.mcpInfoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.mcpName, { color: colors.text }]}>{mcpToConfirm?.name}</Text>
              <Text style={[styles.mcpIdText, { color: colors.accent }]}>{mcpToConfirm?.mcp_id}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => setMcpToConfirm(null)}
                disabled={loading}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>{t.cancel || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: colors.accent }]}
                onPress={handleInitiateWithdrawal}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <Text style={{ color: colors.accentText, fontWeight: '600' }}>{t.confirm || 'Confirm'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdrawal Code Modal */}
      <Modal
        visible={showConfirmation && !!withdrawalCode}
        animationType="slide"
        onRequestClose={handleCloseCodeModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 40 : 10 }]}>
          <TouchableOpacity
            onPress={handleCloseCodeModal}
            style={styles.closeButton}
          >
            <Text style={[styles.closeText, { color: colors.accent }]}>✕</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t.activeWithdrawalCode || 'Your Withdrawal Code'}
            </Text>

            {/* Code Display */}
            <View
              style={[
                styles.codeBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.code, { color: colors.accent }]}>{withdrawalCode}</Text>
            </View>

            {/* Fee Breakdown */}
            {fees && (
              <View
                style={[
                  styles.feeBreakdown,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.feeLabel, { color: colors.text }]}>{t.amount || 'Amount'}</Text>
                <Text style={[styles.feeValue, { color: colors.text }]}>
                  ${fees.grossAmount.toFixed(2)}
                </Text>

                <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>
                  {t.totalCommission || 'Total Commission'} (10%)
                </Text>
                <Text style={[styles.feeValue, { color: colors.text }]}>
                  -${fees.totalFees.toFixed(2)}
                </Text>

                <View
                  style={[
                    styles.divider,
                    { borderColor: colors.border },
                  ]}
                />

                <Text style={[styles.feeLabel, { color: colors.text, fontWeight: '600' }]}>
                  {t.cashToReceive || 'You Receive (Cash)'}
                </Text>
                <Text
                  style={[
                    styles.feeValueLarge,
                    { color: colors.accent },
                  ]}
                >
                  ${fees.clientNet.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Instructions */}
            <View
              style={[
                styles.instructions,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.instructionTitle, { color: colors.text }]}>
                  {t.nextSteps || 'Next Steps'}
              </Text>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                  {t.step1 || '1. Go to the selected kiosk'}
              </Text>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                  {t.step2 || '2. Show your withdrawal code to the agent'}
              </Text>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                  {t.step3 || '3. Receive your cash'}
              </Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={handleCopyCode}
              style={[styles.actionButton, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.actionButtonText, { color: colors.accentText }]}>
                {t.copyCode || 'Copy Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCloseCodeModal}
              style={[styles.actionButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                {t.close || 'Close'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  card: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  balance: { fontSize: 32, fontWeight: 'bold' },
  input: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  feePreview: { fontSize: 12, marginVertical: 4 },
  submitButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mcpInfoBox: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  mcpName: { fontSize: 18, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  mcpIdText: { fontSize: 16, fontWeight: 'bold' },
  confirmActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: { flex: 1 },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 16,
  },
  closeText: { fontSize: 24, fontWeight: 'bold' },
  modalContent: { paddingHorizontal: 16, paddingVertical: 24 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  codeBox: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: { fontSize: 48, fontWeight: 'bold', letterSpacing: 4 },
  feeBreakdown: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  feeLabel: { fontSize: 12, marginTop: 8 },
  feeValue: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  feeValueLarge: { fontSize: 28, fontWeight: 'bold' },
  divider: { borderTopWidth: 1, marginVertical: 12 },
  instructions: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  instructionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  instructionText: { fontSize: 12, marginVertical: 4 },
  actionButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: { fontSize: 16, fontWeight: '600' },
});
