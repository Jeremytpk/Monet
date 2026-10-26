import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';
import { initiateTransfer } from '../../../lib/functions';
import { initiateKioskCashOut } from '../../../lib/kiosk';
import { formatMoney } from '../../../lib/format';
import { useRecipientData } from '../../../components/send/useRecipientData';
import {
  AmountInput,
  AppText,
  Avatar,
  Button,
  Card,
  CodeDisplay,
  DetailRow,
  Icon,
  IconButton,
  IconChip,
  ListGroup,
  ListItem,
  Screen,
  Segmented,
  Sheet,
  TextField,
} from '../../../components/ui';
import { GuestPrompt } from '../../../components/GuestPrompt';

const KIOSK_FEE_RATE = 0.10; // display only; the server computes the real split

function isAgent(r) {
  return !!r && (r.is_agent || String(r.role || '').toLowerCase() === 'mcp' || !!r.mcp_id);
}

function SearchField({ value, onChangeText, placeholder }) {
  const { colors, radii, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: radii.control, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card }}>
      <Icon name="search" size={20} color="muted" />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        style={[typography.body, { flex: 1, color: colors.text, paddingVertical: 12 }]}
      />
      {value ? <IconButton icon="close" label="Clear" variant="plain" size={36} onPress={() => onChangeText('')} /> : null}
    </View>
  );
}

export default function SendScreen() {
  const { user, profile } = useAuth();
  const { colors, radii } = useTheme();
  const { t } = useLanguage();
  const { recipients, setRecipients, mostSentUids, loading } = useRecipientData(user, t);

  const [selectedUid, setSelectedUid] = useState(null);
  const [amount, setAmount] = useState('');
  const [fundingSource, setFundingSource] = useState('wallet');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [amountError, setAmountError] = useState(null);

  const [reviewVisible, setReviewVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [kioskSearchVisible, setKioskSearchVisible] = useState(false);
  const [kioskSearchId, setKioskSearchId] = useState('');
  const [kioskSearchLoading, setKioskSearchLoading] = useState(false);
  const [kioskSearchError, setKioskSearchError] = useState(null);
  const [foundKiosk, setFoundKiosk] = useState(null);
  const [withdrawalCode, setWithdrawalCode] = useState(null);

  const balance = Number(profile?.wallet_balance ?? 0);
  const num = parseFloat(amount) || 0;

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredRecipients = searchLower
    ? recipients.filter(
        (r) =>
          (r.name || '').toLowerCase().includes(searchLower) ||
          (r.phone || '').replace(/\s/g, '').includes(searchLower.replace(/\s/g, ''))
      )
    : [];
  const recentRecipients = mostSentUids.map((uid) => recipients.find((r) => r.id === uid)).filter(Boolean);
  const selectedRecipient = recipients.find((r) => r.id === selectedUid);
  const isKiosk = isAgent(selectedRecipient);
  const kioskFee = num * KIOSK_FEE_RATE;

  function selectRecipient(id) {
    setSelectedUid(id);
    setSearchQuery('');
    if (isAgent(recipients.find((r) => r.id === id))) setFundingSource('wallet');
  }

  async function handleSearchKiosk() {
    if (!kioskSearchId.trim()) return;
    setKioskSearchLoading(true);
    setFoundKiosk(null);
    setKioskSearchError(null);
    try {
      const searchStr = kioskSearchId.trim().toUpperCase().replace('MCP', '');
      const snap = await getDocs(query(collection(db, 'profiles'), where('is_agent', '==', true)));
      const match = snap.docs.find((d) => {
        const mcpId = d.data().mcp_id;
        return mcpId && mcpId.toUpperCase().includes(searchStr);
      });
      if (!match) setKioskSearchError(t.kioskNotFound);
      else setFoundKiosk({ id: match.id, ...match.data() });
    } catch (e) {
      setKioskSearchError(e.message);
    } finally {
      setKioskSearchLoading(false);
    }
  }

  function chooseKiosk(kiosk) {
    if (!recipients.find((r) => r.id === kiosk.id)) setRecipients([kiosk, ...recipients]);
    setSelectedUid(kiosk.id);
    setFundingSource('wallet');
    setKioskSearchVisible(false);
    setFoundKiosk(null);
    setKioskSearchId('');
  }

  function openReview() {
    if (!selectedUid || !num || num <= 0) {
      setAmountError(!num ? t.errValidAmount : null);
      if (!selectedUid) Alert.alert(t.error, t.errSelectRecipient);
      return;
    }
    if (fundingSource === 'wallet' && num > balance) {
      setAmountError(t.errInsufficientWallet);
      return;
    }
    if (isKiosk && fundingSource !== 'wallet') {
      Alert.alert(t.error, t.errKioskWalletOnly);
      return;
    }
    setAmountError(null);
    setReviewVisible(true);
  }

  function reset() {
    setAmount('');
    setSelectedUid(null);
    setWithdrawalCode(null);
  }

  async function confirmSend() {
    setSending(true);
    try {
      if (isKiosk) {
        const result = await initiateKioskCashOut(num, selectedUid);
        if (result.success) setWithdrawalCode(result.withdrawal_code);
      } else {
        await initiateTransfer(selectedUid, num, fundingSource);
        setReviewVisible(false);
        setSuccessMessage(fundingSource === 'wallet' ? t.successTransferWallet : t.successTransferExternal);
        setSuccessVisible(true);
      }
    } catch (e) {
      setReviewVisible(false);
      Alert.alert(t.error, e.message || t.errTransferFailed);
    } finally {
      setSending(false);
    }
  }

  function closeReview() {
    if (!withdrawalCode) {
      setReviewVisible(false);
      return;
    }
    Alert.alert(t.confirmCloseCodeTitle, t.confirmCloseCodeMsg, [
      { text: t.cancel, style: 'cancel' },
      { text: t.close, style: 'destructive', onPress: () => { setReviewVisible(false); reset(); } },
    ]);
  }

  if (!user) {
    return (
      <Screen>
        <AppText variant="title" accessibilityRole="header">{t.sendMoney}</AppText>
        <GuestPrompt />
      </Screen>
    );
  }

  const sourceLabel = { wallet: t.walletBalance, card: t.debitOrCreditCard?.replace('\n', ' '), bank: t.bankAccount }[fundingSource];
  const firstName = (selectedRecipient?.name || t.recipient || '').split(' ')[0];

  return (
    <Screen
      footer={
        <Button
          title={selectedRecipient && num > 0 ? t.sendAmountTo.replace('{amount}', formatMoney(num)).replace('{name}', firstName) : t.reviewSend}
          icon={<Icon name="send" size={18} color={colors.accentText} />}
          onPress={openReview}
          disabled={!selectedRecipient || !(num > 0)}
        />
      }
    >
      <View style={{ gap: 4 }}>
        <AppText variant="title" accessibilityRole="header">{t.sendMoney}</AppText>
        <AppText variant="body" color="muted">{t.sendMoneySubtitle}</AppText>
      </View>

      {/* 1. Recipient */}
      <View style={{ gap: 12 }}>
        <AppText variant="heading" accessibilityRole="header">{t.sendTo}</AppText>
        {selectedRecipient ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: colors.accent, borderWidth: 1.5 }} padding={14}>
            {isKiosk ? <IconChip icon="kiosk" tone="highlight" size={48} /> : <Avatar name={selectedRecipient.name} uri={selectedRecipient.photoURL} size={48} />}
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong" numberOfLines={1}>{selectedRecipient.name || t.noName}</AppText>
              <AppText variant="caption" color="muted" numberOfLines={1}>
                {isKiosk ? `${t.kiosk} · ${selectedRecipient.mcp_id}` : selectedRecipient.phone || ''}
              </AppText>
            </View>
            <Button title={t.change} variant="ghost" onPress={() => setSelectedUid(null)} style={{ minHeight: 40, paddingHorizontal: 12 }} />
          </Card>
        ) : (
          <>
            <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder={t.searchPlaceholder} />
            {loading ? (
              <ActivityIndicator color={colors.accent} />
            ) : searchLower ? (
              filteredRecipients.length ? (
                <ListGroup>
                  {filteredRecipients.slice(0, 20).map((r) => (
                    <Pressable
                      key={r.id}
                      accessibilityRole="button"
                      onPress={() => selectRecipient(r.id)}
                      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: pressed ? colors.accentSoft : 'transparent' })}
                    >
                      {isAgent(r) ? <IconChip icon="kiosk" tone="highlight" size={44} /> : <Avatar name={r.name} uri={r.photoURL} />}
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="bodyStrong" numberOfLines={1} style={{ fontSize: 15 }}>{r.name || t.noName}</AppText>
                        <AppText variant="caption" color="muted" numberOfLines={1}>{isAgent(r) ? r.mcp_id : r.phone || ''}</AppText>
                      </View>
                      <Icon name="chevron-right" size={18} color="muted" />
                    </Pressable>
                  ))}
                </ListGroup>
              ) : (
                <AppText variant="body" color="muted" style={{ textAlign: 'center', paddingVertical: 12 }}>{t.noOneFound}</AppText>
              )
            ) : (
              <>
                {recentRecipients.length ? (
                  <View style={{ gap: 10 }}>
                    <AppText variant="label" color="muted">{t.recentlySent}</AppText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                      {recentRecipients.map((r) => (
                        <Pressable
                          key={r.id}
                          accessibilityRole="button"
                          accessibilityLabel={r.name || r.mcp_id}
                          onPress={() => selectRecipient(r.id)}
                          style={{ alignItems: 'center', gap: 6, width: 64 }}
                        >
                          {isAgent(r) ? <IconChip icon="kiosk" tone="highlight" size={56} /> : <Avatar name={r.name} uri={r.photoURL} size={56} />}
                          <AppText variant="caption" numberOfLines={1}>{(r.name || r.mcp_id || '—').split(' ')[0]}</AppText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : recipients.length === 0 ? (
                  <AppText variant="body" color="muted">{t.noContacts}</AppText>
                ) : null}
                <ListGroup>
                  <ListItem
                    icon="kiosk"
                    tone="highlight"
                    title={t.sendToKiosk}
                    subtitle={t.sendToKioskHint}
                    onPress={() => { setKioskSearchId(''); setFoundKiosk(null); setKioskSearchError(null); setKioskSearchVisible(true); }}
                  />
                </ListGroup>
              </>
            )}
          </>
        )}
      </View>

      {/* 2. Amount */}
      <Card>
        <AmountInput
          label={t.amount}
          value={amount}
          onChangeText={(v) => { setAmount(v); setAmountError(null); }}
          available={balance}
          availableLabel={t.available}
          error={amountError}
          presets={[20, 50, 100, 200]}
        />
        {isKiosk && num > 0 ? (
          <AppText variant="caption" color="muted" style={{ textAlign: 'center', marginTop: 4 }}>
            {t.kioskFeeNote.replace('{fee}', formatMoney(kioskFee)).replace('{net}', formatMoney(num - kioskFee))}
          </AppText>
        ) : null}
      </Card>

      {/* 3. Funding source */}
      <View style={{ gap: 12 }}>
        <AppText variant="heading" accessibilityRole="header">{t.payFrom}</AppText>
        <Segmented
          variant="tiles"
          value={fundingSource}
          onChange={setFundingSource}
          options={[
            { value: 'wallet', label: t.walletBalance, icon: 'wallet' },
            { value: 'card', label: t.debitOrCreditCard?.replace('\n', ' '), icon: 'card', disabled: isKiosk },
            { value: 'bank', label: t.bankAccount, icon: 'bank', disabled: isKiosk },
          ]}
        />
        {isKiosk ? <AppText variant="caption" color="muted">{t.errKioskWalletOnly}</AppText> : null}
      </View>

      {/* Review / kiosk code */}
      <Sheet visible={reviewVisible} onClose={closeReview} title={withdrawalCode ? t.activeWithdrawalCode : isKiosk ? t.confirmKioskSend : t.reviewTitle}>
        {withdrawalCode ? (
          <>
            <AppText variant="body" color="muted">{t.showCodeToAgent}</AppText>
            <CodeDisplay code={withdrawalCode} />
            <DetailRow label={t.cashToReceive} value={formatMoney(num - kioskFee)} strong />
            <Button title={t.done} onPress={closeReview} />
          </>
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 4 }}>
              {isKiosk ? <IconChip icon="kiosk" tone="highlight" size={56} /> : <Avatar name={selectedRecipient?.name} uri={selectedRecipient?.photoURL} size={56} />}
              <AppText variant="amount">{formatMoney(num)}</AppText>
              <AppText variant="body" color="muted">
                {t.to} {selectedRecipient?.name}{isKiosk ? ` (${selectedRecipient?.mcp_id})` : ''}
              </AppText>
            </View>
            <View style={{ gap: 8, padding: 16, borderRadius: radii.control, backgroundColor: colors.background }}>
              <DetailRow label={t.payFrom} value={sourceLabel} />
              {isKiosk ? (
                <>
                  <DetailRow label={`${t.totalCommission} (10%)`} value={`−${formatMoney(kioskFee)}`} />
                  <DetailRow label={t.cashToReceive} value={formatMoney(num - kioskFee)} strong />
                </>
              ) : (
                <DetailRow label={t.txFees} value={formatMoney(0)} />
              )}
            </View>
            <Button title={t.confirm} onPress={confirmSend} loading={sending} />
          </>
        )}
      </Sheet>

      {/* Success */}
      <Sheet visible={successVisible} onClose={() => { setSuccessVisible(false); reset(); }}>
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <IconChip icon="check" size={64} />
          <AppText variant="title" style={{ textAlign: 'center' }}>{t.sentTitle}</AppText>
          <AppText variant="body" color="muted" style={{ textAlign: 'center' }}>{successMessage}</AppText>
        </View>
        <Button title={t.done} onPress={() => { setSuccessVisible(false); reset(); }} />
      </Sheet>

      {/* Find a kiosk */}
      <Sheet visible={kioskSearchVisible} onClose={() => setKioskSearchVisible(false)} title={t.findKiosk}>
        <TextField
          label={t.kioskMcpId}
          placeholder="MCP1234567"
          value={kioskSearchId}
          onChangeText={(text) => { setKioskSearchId(text.toUpperCase().replace(/\s/g, '')); setKioskSearchError(null); }}
          autoCapitalize="characters"
          onSubmitEditing={handleSearchKiosk}
          error={kioskSearchError}
        />
        <Button title={t.search} variant="soft" onPress={handleSearchKiosk} loading={kioskSearchLoading} disabled={!kioskSearchId} />
        {foundKiosk ? (
          <ListGroup>
            <ListItem icon="kiosk" tone="highlight" title={foundKiosk.name || t.kiosk} subtitle={foundKiosk.mcp_id} onPress={() => chooseKiosk(foundKiosk)} />
          </ListGroup>
        ) : null}
      </Sheet>
    </Screen>
  );
}
