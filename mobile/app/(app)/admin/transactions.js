import { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../lib/ThemeContext';
import { useAuth } from '../../../lib/useAuth';
import { useLanguage } from '../../../lib/LanguageContext';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { adminCancelTransaction } from '../../../lib/functions';

export default function AdminTransactions() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { t, lang } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
  if (!profile || String(profile.role || '').toLowerCase() !== 'admin') return;
    // fallback: read recent transactions by scanning recent users (simple approach)
    const unsubUsers = [];
    const usersUnsub = async () => {
      // Fetch a larger pool of users to map names to IDs
      const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('created_at', 'desc'), limit(200)));
      const userMap = new Map(usersSnap.docs.map((d) => [d.id, d.data()]));

      usersSnap.docs.forEach((uDoc) => {
        const q2 = query(collection(db, 'users', uDoc.id, 'transactions'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q2, (snap) => {
          snap.docs.forEach((d) => setTransactions((s) => {
            const data = d.data();
            const sName = data.sender_id ? (userMap.get(data.sender_id)?.name || userMap.get(data.sender_id)?.displayName) : null;
            const rName = data.receiver_id ? (userMap.get(data.receiver_id)?.name || userMap.get(data.receiver_id)?.displayName) : null;
            const mcpUid = data.metadata?.mcp_uid || data.mcp_id;
            const mName = mcpUid ? (userMap.get(mcpUid)?.name || userMap.get(mcpUid)?.displayName) : null;

            const txObj = { 
              id: d.id, 
              owner: uDoc.id, 
              ...data,
              _sender_name: sName,
              _receiver_name: rName,
              _mcp_name: mName
            };

            const exists = s.find((x) => x.id === d.id);
            if (exists) return s.map((x) => x.id === d.id ? txObj : x);
            return [txObj, ...s].slice(0, 200);
          }));
        }, (err) => { console.warn('transactions sub onSnapshot error', err); });
        unsubUsers.push(unsub);
      });
    };
    usersUnsub();
    return () => unsubUsers.forEach((u) => u());
  }, [profile?.role]);

  if (!profile || String(profile.role || '').toLowerCase() !== 'admin') return null;

  const filteredTransactions = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => {
      const sender = String(t._sender_name || t.sender_id || '').toLowerCase();
      const receiver = String(t._receiver_name || t.receiver_id || '').toLowerCase();
      const mcp = String(t._mcp_name || t.metadata?.mcp_uid || t.metadata?.mcp_name || '').toLowerCase();
      const ref = String(t.gateway_ref || t.id || '').toLowerCase();
      return sender.includes(q) || receiver.includes(q) || mcp.includes(q) || ref.includes(q);
    });
  }, [transactions, search]);

  const handleCancel = (owner, id) => {
    Alert.alert(t.cancel_transaction || 'Cancel transaction', t.cancel_transaction_msg || 'This will reverse the transaction and return funds. Continue?', [
      { text: t.cancel || 'Cancel', style: 'cancel' },
      { text: t.cancel_transaction || 'Cancel transaction', style: 'destructive', onPress: async () => {
        try {
          await adminCancelTransaction(owner, id);
          Alert.alert(t.cancelled || 'Cancelled');
        } catch (err) { Alert.alert(t.error || 'Error', err.message || String(err)); }
      } }
    ]);
  };

  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'completed' || s === 'success') return '#22C55E';
    if (s === 'pending') return '#F59E0B';
    if (s === 'failed' || s === 'cancelled') return '#EF4444';
    return colors.textSecondary;
  };

  const renderItem = ({ item }) => {
    const tType = String(item.type || '').toLowerCase();
    const typeLabel = t[tType] || (item.type ? item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : (t.transaction || 'Transaction'));
    const isIncoming = tType === 'incoming_transfer' || tType === 'deposit';
    const dateStr = new Date(item.timestamp?.toDate?.() || Date.now()).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US');
    
    const txTime = item.timestamp?.toDate?.().getTime() || Date.now();
    const isCancellable = (Date.now() - txTime) <= 24 * 60 * 60 * 1000;
    
    let senderName = item._sender_name || (item.sender_id ? item.sender_id.slice(0, 8) + '...' : (t.system || 'System'));
    let receiverName = item._receiver_name || (item.receiver_id ? item.receiver_id.slice(0, 8) + '...' : '');

    // For kiosk transactions, swap the empty receiver/system with the MCP's name and ID
    if (tType.includes('kiosk') || item.metadata?.mcp_uid || item.metadata?.mcp_name) {
      const mcpTarget = item._mcp_name || item.metadata?.mcp_name || item.metadata?.mcp_uid;
      if (mcpTarget) {
        if (isIncoming) senderName = String(mcpTarget);
        else receiverName = String(mcpTarget);
      }
    }

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <View style={styles.cardMain}>
          <View style={styles.participantRow}>
            <Text style={[styles.participantText, { color: colors.text }]} numberOfLines={1}>{senderName}</Text>
            {receiverName ? (
              <>
                <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} style={{ marginHorizontal: 6 }} />
                <Text style={[styles.participantText, { color: colors.text }]} numberOfLines={1}>{receiverName}</Text>
              </>
            ) : null}
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {typeLabel} • {item.gateway_ref || item.id}
          </Text>
          <Text style={[styles.cardDate, { color: colors.muted }]}>{dateStr}</Text>
          
          {item.status !== 'cancelled' && isCancellable && (
            <TouchableOpacity onPress={() => handleCancel(item.owner, item.id)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.accent }]}>{t.cancel_transaction || 'Cancel Transaction'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardRight}>
          <Text style={[styles.amountText, { color: colors.text }]}>
            ${Number(item.amount || 0).toFixed(2)}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + '1A' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status ? (t[item.status.toLowerCase()] || item.status).toUpperCase() : (t.na || 'N/A')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background, padding: 24 }]}> 
      <TextInput
        placeholder={t.search_name_id_ref || "Search by name, ID, or reference..."}
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
      />
      <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
        {t.total_transactions || 'Total Transactions:'} <Text style={{ color: colors.text }}>{filteredTransactions.length}</Text>
      </Text>
      <FlatList 
        data={filteredTransactions} 
        keyExtractor={(i) => i.id} 
        renderItem={renderItem} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  cardMain: { flex: 1, paddingRight: 12 },
  participantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  participantText: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  cardSubtitle: { fontSize: 13, marginBottom: 3 },
  cardDate: { fontSize: 12, marginBottom: 4 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center' },
  amountText: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cancelBtn: { marginTop: 6, paddingVertical: 4 },
  cancelText: { fontSize: 13, fontWeight: '600' },
});
