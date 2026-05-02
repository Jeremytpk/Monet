import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../../lib/ThemeContext';
import { useAuth } from '../../../lib/useAuth';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { adminCancelTransaction } from '../../../lib/functions';

export default function AdminTransactions() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
  if (!profile || String(profile.role || '').toLowerCase() !== 'admin') return;
    // fallback: read recent transactions by scanning recent users (simple approach)
    const unsubUsers = [];
    const usersUnsub = async () => {
      const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('created_at', 'desc'), limit(50)));
      usersSnap.docs.forEach((uDoc) => {
        const q2 = query(collection(db, 'users', uDoc.id, 'transactions'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q2, (snap) => {
          snap.docs.forEach((d) => setTransactions((s) => {
            const exists = s.find((x) => x.id === d.id);
            if (exists) return s.map((x) => x.id === d.id ? { id: d.id, owner: uDoc.id, ...d.data() } : x);
            return [{ id: d.id, owner: uDoc.id, ...d.data() }, ...s].slice(0, 200);
          }));
        }, (err) => { console.warn('transactions sub onSnapshot error', err); });
        unsubUsers.push(unsub);
      });
    };
    usersUnsub();
    return () => unsubUsers.forEach((u) => u());
  }, [profile?.role]);

  if (!profile || String(profile.role || '').toLowerCase() !== 'admin') return null;

  const handleCancel = (owner, id) => {
    Alert.alert('Cancel transaction', 'This will reverse the transaction and return funds. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Cancel transaction', style: 'destructive', onPress: async () => {
        try {
          await adminCancelTransaction(owner, id);
          Alert.alert('Cancelled');
        } catch (err) { Alert.alert('Error', err.message || String(err)); }
      } }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.row, { borderColor: colors.border }]}> 
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.text }]}>{item.type || item.gateway_ref || item.id}</Text>
        <Text style={{ color: colors.textSecondary }}>{item.sender_id} → {item.receiver_id} • ${item.amount}</Text>
        <Text style={{ color: colors.textSecondary }}>{item.status} • {new Date(item.timestamp?.toDate?.() || Date.now()).toLocaleString()}</Text>
      </View>
      <TouchableOpacity onPress={() => handleCancel(item.owner, item.id)} style={styles.action}>
        <Text style={{ color: colors.accent }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background, padding: 24 }]}> 
      <FlatList data={transactions} keyExtractor={(i) => i.id} renderItem={renderItem} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} />
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 10 }, name: { fontSize: 16, fontWeight: '600' }, action: { padding: 8 } });
