import { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { useTheme } from '../../../lib/ThemeContext';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/useAuth';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { adminDeleteUser, adminEditUser } from '../../../lib/functions';

export default function AdminUsers() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);

  const filtered = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = String(u.name || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      const phone = String(u.phone || '').toLowerCase();
      const id = String(u.id || '').toLowerCase();
      const mcp_id = String(u.mcp_id || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || id.includes(q) || mcp_id.includes(q);
    });
  }, [users, search]);

  useEffect(() => {
    if (!profile || String(profile.role || '').toLowerCase() !== 'admin') return;
    const q = query(collection(db, 'users'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn('users onSnapshot error', err);
      Alert.alert('Permission error', 'Unable to load users: insufficient permissions');
    });
    return () => unsub();
  }, [profile?.role]);

  if (!profile || String(profile.role || '').toLowerCase() !== 'admin') return null;

  const handleDelete = (uid) => {
    Alert.alert('Delete user', 'This will delete the user and their data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await adminDeleteUser(uid);
          Alert.alert('Deleted');
        } catch (err) { Alert.alert('Error', err.message || String(err)); }
      } }
    ]);
  };

  const handleRoleChange = (uid) => {
    setSelectedUserForRole(uid);
    setRoleModalVisible(true);
  };

  const updateRole = async (newRole) => {
    if (!selectedUserForRole) return;
    const targetUser = users.find((u) => u.id === selectedUserForRole);
    const updates = { role: newRole, force_logout: true };

    if (newRole === 'mcp' && (!targetUser || !targetUser.mcp_id)) {
      const randomNums = Math.floor(1000000 + Math.random() * 9000000).toString();
      updates.mcp_id = `MCP${randomNums}`;
    }

    try {
      await adminEditUser(selectedUserForRole, updates);
    } catch (err) { Alert.alert('Error', err.message || String(err)); }
    setRoleModalVisible(false);
    setSelectedUserForRole(null);
  };

  const router = useRouter();

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => router.push(`/(app)/admin/users/${item.id}`)} activeOpacity={0.85}>
      <View style={[styles.row, { borderColor: colors.border }]}> 
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name || item.email || item.phone || item.id}</Text>
          <Text style={{ color: colors.textSecondary }}>{item.email || item.phone || ''} • {item.role || 'User'}</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => handleRoleChange(item.id)} style={styles.action}>
            <Text style={{ color: colors.accent }}>Role</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.action}>
            <Text style={{ color: '#EF4444' }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background, padding: 24 }]}> 
      <TextInput
        placeholder="Search by name, email, phone, or MCP ID"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
      />
      <FlatList data={filtered} keyExtractor={(i) => i.id} renderItem={renderItem} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} />

      <Modal visible={roleModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRoleModalVisible(false)}
        >
          <View style={[styles.dropdownContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dropdownTitle, { color: colors.text }]}>Select Role</Text>
            {['admin', 'mcp', ''].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.dropdownItem, { borderTopColor: colors.border }]}
                onPress={() => updateRole(r)}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>
                  {r === 'admin' ? 'Admin' : r === 'mcp' ? 'MCP' : 'None (Regular User)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 10 },
  name: { fontSize: 16, fontWeight: '600' },
  action: { padding: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    textAlign: 'center',
  },
  dropdownItem: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
});
