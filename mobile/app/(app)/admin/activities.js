import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../../../lib/ThemeContext';
import { useAuth } from '../../../lib/useAuth';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function AdminActivities() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [activities, setActivities] = useState([]);

  useEffect(() => {
  if (!profile || String(profile.role || '').toLowerCase() !== 'admin') return;
    const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => { console.warn('activities onSnapshot error', err); });
    return () => unsub();
  }, [profile?.role]);

  if (!profile || String(profile.role || '').toLowerCase() !== 'admin') return null;

  const renderItem = ({ item }) => (
    <View style={[styles.row, { borderColor: colors.border }]}> 
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.text }]}>{item.action}</Text>
        <Text style={{ color: colors.textSecondary }}>{item.actor_uid || 'system'} • {new Date(item.timestamp?.toDate?.() || Date.now()).toLocaleString()}</Text>
        <Text style={{ color: colors.textSecondary }}>{JSON.stringify(item.metadata || {})}</Text>
      </View>
    </View>
  );

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background, padding: 24 }]}> 
      <FlatList data={activities} keyExtractor={(i) => i.id} renderItem={renderItem} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} />
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 10 }, name: { fontSize: 16, fontWeight: '600' } });
