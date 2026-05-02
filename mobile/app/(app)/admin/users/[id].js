import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../lib/ThemeContext';
import { db } from '../../../../lib/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { adminDeleteUser, adminEditUser } from '../../../../lib/functions';

export default function UserDetail() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id;
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [addAmount, setAddAmount] = useState('');

  useEffect(() => {
    if (!id) return;
    const ref = doc(db, 'users', id);
    getDoc(ref).then((snap) => { if (snap.exists()) { setUser(snap.data()); setName(snap.data().name || ''); setPhone(snap.data().phone || ''); setRole(snap.data().role || ''); } });

    const q = query(collection(db, `users/${id}/transactions`), orderBy('timestamp', 'desc'));
    const unsubTx = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => { console.warn('user transactions onSnapshot error', err); });

    const q2 = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
    const unsubAct = onSnapshot(q2, (snap) => {
      setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(a => a.target_uid === id));
    }, (err) => { console.warn('activities onSnapshot error', err); });

    return () => { unsubTx(); unsubAct(); };
  }, [id]);

  if (!id) return null;

  const handleSave = async () => {
    try {
      await adminEditUser(id, { name, phone, role });
      Alert.alert('Saved');
    } catch (err) { Alert.alert('Error', err.message || String(err)); }
  };

  const handleDelete = () => {
    Alert.alert('Delete user', 'This will delete the user and their data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await adminDeleteUser(id); router.replace('/(app)/admin/users'); } catch (err) { Alert.alert('Error', err.message || String(err)); }
      } }
    ]);
  };

  const handleAddFunds = async () => {
    const num = parseFloat(addAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid positive number');
      return;
    }
    try {
      const newBalance = (user?.wallet_balance || 0) + num;
      await adminEditUser(id, { wallet_balance: newBalance });
      Alert.alert('Simulated', `Added $${num.toFixed(2)} to wallet balance`);
      setAddAmount('');
    } catch (err) { Alert.alert('Error', err.message || String(err)); }
  };

  return (
    <ScrollView style={[{ flex: 1, backgroundColor: colors.background, padding: 24 }]}>
      <Text style={[{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 }]}>{user?.name || id}</Text>
      <Text style={[{ color: colors.accent, fontSize: 16, fontWeight: '600', marginBottom: 16 }]}>Balance: ${(user?.wallet_balance || 0).toFixed(2)}</Text>

      <View style={{ marginBottom: 14 }}>
        <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>Name</Text>
        <TextInput value={name} onChangeText={setName} style={{ backgroundColor: colors.card, padding: 12, borderRadius: 10, color: colors.text }} />
      </View>

      <View style={{ marginBottom: 14 }}>
        <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>Phone</Text>
        <TextInput value={phone} onChangeText={setPhone} style={{ backgroundColor: colors.card, padding: 12, borderRadius: 10, color: colors.text }} />
      </View>

      <View style={{ marginBottom: 14 }}>
        <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>Role</Text>
        <TextInput value={role} onChangeText={setRole} style={{ backgroundColor: colors.card, padding: 12, borderRadius: 10, color: colors.text }} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <TouchableOpacity onPress={handleSave} style={{ backgroundColor: colors.accent, padding: 12, borderRadius: 10 }}>
          <Text style={{ color: colors.accentText }}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={{ borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 10 }}>
          <Text style={{ color: '#EF4444' }}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Simulate Add Funds</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <TextInput
          placeholder="0.00"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          value={addAmount}
          onChangeText={setAddAmount}
          style={{ backgroundColor: colors.card, padding: 12, borderRadius: 10, color: colors.text, width: 120, borderWidth: 1, borderColor: colors.border }}
        />
        <TouchableOpacity onPress={handleAddFunds} style={{ backgroundColor: '#10B981', padding: 12, borderRadius: 10 }}>
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Add Funds</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Recent Transactions</Text>
      {transactions.map((t) => (
        <View key={t.id} style={{ backgroundColor: colors.card, padding: 12, borderRadius: 10, marginBottom: 8 }}>
          <Text style={{ color: colors.text }}>{t.type} • ${t.amount}</Text>
          <Text style={{ color: colors.textSecondary }}>{t.status}</Text>
        </View>
      ))}

      <Text style={{ color: colors.textSecondary, marginTop: 14, marginBottom: 8 }}>Recent Activities</Text>
      {activities.map((a) => (
        <View key={a.id} style={{ backgroundColor: colors.card, padding: 12, borderRadius: 10, marginBottom: 8 }}>
          <Text style={{ color: colors.text }}>{a.action}</Text>
          <Text style={{ color: colors.textSecondary }}>{JSON.stringify(a.metadata || {})}</Text>
        </View>
      ))}

    </ScrollView>
  );
}
