import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useTheme } from '../../../lib/ThemeContext';
import { useAuth } from '../../../lib/useAuth';
import { useLanguage } from '../../../lib/LanguageContext';
import { db } from '../../../lib/firebase';
import { adminDeleteUser, adminEditUser } from '../../../lib/functions';
import { roleLabel } from '../../../lib/admin';
import { AppText, Avatar, Card, EmptyState, Header, IconButton, ListGroup, ListItem, Screen, Sheet, StatusBadge } from '../../../components/ui';
import { AdminSearch } from '../../../components/AdminSearch';
import { Character } from '../../../components/brand';

const ROLES = [
  { value: 'admin', icon: 'shield' },
  { value: 'mcp', icon: 'kiosk' },
  { value: 'user', icon: 'user' },
];

export default function AdminUsers() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleTarget, setRoleTarget] = useState(null);
  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin';

  const filtered = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.phone, u.id, u.mcp_id].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [users, search]);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => {
      console.warn('users onSnapshot error', err);
      Alert.alert(t.error, t.errLoadUsers);
    });
    return () => unsub();
  }, [isAdmin]);

  if (!isAdmin) return null;

  function handleDelete(user) {
    Alert.alert(t.deleteUser, t.deleteUserMsg.replace('{name}', user.name || user.email || user.id), [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await adminDeleteUser(user.id);
          } catch (err) {
            Alert.alert(t.error, err.message || String(err));
          }
        },
      },
    ]);
  }

  async function updateRole(newRole) {
    const target = roleTarget;
    setRoleTarget(null);
    if (!target) return;
    const updates = { role: newRole, force_logout: true };
    if (newRole === 'mcp' && !target.mcp_id) {
      updates.mcp_id = `MCP${Math.floor(1000000 + Math.random() * 9000000)}`;
    }
    try {
      await adminEditUser(target.id, updates);
    } catch (err) {
      Alert.alert(t.error, err.message || String(err));
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.adminUsers} subtitle={t.countUsers.replace('{n}', String(users.length))} />
      <AdminSearch value={search} onChangeText={setSearch} placeholder={t.searchUsers} />

      <Card padding={0} style={{ overflow: 'hidden' }}>
        {filtered.length ? filtered.map((u, i) => (
          <View key={u.id}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 72 }} /> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/(app)/admin/users/${u.id}`)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 16, paddingRight: 8, backgroundColor: pressed ? colors.accentSoft : 'transparent' })}
            >
              <Avatar name={u.name || u.email} uri={u.photoURL} />
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="bodyStrong" numberOfLines={1} style={{ fontSize: 15 }}>{u.name || u.email || u.phone || u.id}</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <StatusBadge status={u.role === 'admin' ? 'pending' : u.role === 'mcp' ? 'completed' : 'cancelled'} label={roleLabel(u.role, t)} />
                  <AppText variant="caption" color="muted" numberOfLines={1} style={{ flex: 1 }}>{u.email || u.phone || ''}</AppText>
                </View>
              </View>
              <IconButton icon="users" label={t.changeRole} variant="plain" onPress={() => setRoleTarget(u)} />
              <IconButton icon="trash" label={t.deleteUser} variant="plain" onPress={() => handleDelete(u)} />
            </Pressable>
          </View>
        )) : (
          <EmptyState art={<Character name="grace" size={110} />} title={t.noUsersFound} />
        )}
      </Card>

      <Sheet visible={!!roleTarget} onClose={() => setRoleTarget(null)} title={t.changeRole}>
        <AppText variant="body" color="muted">{t.changeRoleMsg.replace('{name}', roleTarget?.name || roleTarget?.email || '')}</AppText>
        <ListGroup>
          {ROLES.map((r) => (
            <ListItem
              key={r.value}
              icon={r.icon}
              tone={r.value === 'mcp' ? 'highlight' : 'accent'}
              title={roleLabel(r.value, t)}
              value={String(roleTarget?.role || 'user').toLowerCase() === r.value ? '✓' : undefined}
              onPress={() => updateRole(r.value)}
            />
          ))}
        </ListGroup>
      </Sheet>
    </Screen>
  );
}
