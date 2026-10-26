import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useTheme } from '../../../../lib/ThemeContext';
import { useLanguage } from '../../../../lib/LanguageContext';
import { db } from '../../../../lib/firebase';
import { adminDeleteUser, adminEditUser } from '../../../../lib/functions';
import { formatMoney } from '../../../../lib/format';
import { describeTransaction, formatTxDate } from '../../../../lib/transactions';
import { AppText, Avatar, Button, Card, DetailRow, Header, Screen, StatusBadge, TextField, TransactionRow } from '../../../../components/ui';
import { formatActivityMeta, roleLabel } from '../../../../lib/admin';

const LIMIT = 5;

export default function UserDetail() {
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showAllTx, setShowAllTx] = useState(false);
  const [showAllAct, setShowAllAct] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubUser = onSnapshot(doc(db, 'users', id), (snap) => {
      const data = snap.exists() ? snap.data() : null;
      setUser(data);
      setName(data?.name || '');
      setPhone(data?.phone || '');
    }, (err) => console.warn('user onSnapshot error', err));
    const unsubTx = onSnapshot(query(collection(db, `users/${id}/transactions`), orderBy('timestamp', 'desc')),
      (snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.warn('user transactions onSnapshot error', err));
    const unsubAct = onSnapshot(query(collection(db, 'activities'), orderBy('timestamp', 'desc')),
      (snap) => setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.target_uid === id)),
      (err) => console.warn('activities onSnapshot error', err));
    return () => { unsubUser(); unsubTx(); unsubAct(); };
  }, [id]);

  if (!id) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await adminEditUser(id, { name, phone });
      Alert.alert(t.saved);
    } catch (err) {
      Alert.alert(t.error, err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(t.deleteUser, t.deleteUserMsg.replace('{name}', user?.name || id), [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await adminDeleteUser(id);
            router.replace('/(app)/admin/users');
          } catch (err) {
            Alert.alert(t.error, err.message || String(err));
          }
        },
      },
    ]);
  }

  const shownTx = showAllTx ? transactions : transactions.slice(0, LIMIT);
  const shownAct = showAllAct ? activities : activities.slice(0, LIMIT);
  const dirty = name !== (user?.name || '') || phone !== (user?.phone || '');

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.userDetails} large={false} />

      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar name={user?.name || user?.email} uri={user?.photoURL} size={80} />
        <AppText variant="title" style={{ textAlign: 'center' }}>{user?.name || id}</AppText>
        <StatusBadge status={user?.role === 'mcp' ? 'completed' : user?.role === 'admin' ? 'pending' : 'cancelled'} label={roleLabel(user?.role, t)} />
      </View>

      <Card style={{ gap: 8 }}>
        <DetailRow label={t.walletBalance} value={formatMoney(Number(user?.wallet_balance || 0))} strong />
        <DetailRow label={t.fieldEmail} value={user?.email || '—'} />
        <DetailRow label={t.fieldWalletId} value={user?.wallet_id || '—'} />
        {user?.mcp_id ? <DetailRow label={t.fieldMcpId} value={user.mcp_id} /> : null}
      </Card>

      <Card style={{ gap: 14 }}>
        <AppText variant="heading">{t.editProfile}</AppText>
        <TextField label={t.fieldName} icon="user" value={name} onChangeText={setName} />
        <TextField label={t.fieldPhone} icon="phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button title={t.save} onPress={handleSave} loading={saving} disabled={!dirty} />
      </Card>

      <View style={{ gap: 10 }}>
        <AppText variant="heading">{t.recentActivity}</AppText>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          {shownTx.length ? shownTx.map((tx, i) => (
            <View key={tx.id}>
              {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 72 }} /> : null}
              <TransactionRow {...describeTransaction(tx, t, lang)} />
            </View>
          )) : (
            <AppText variant="body" color="muted" style={{ padding: 16 }}>{t.noTransactions}</AppText>
          )}
        </Card>
        {transactions.length > LIMIT ? (
          <Button variant="ghost" title={showAllTx ? t.showLess : t.showAllN.replace('{n}', String(transactions.length))} onPress={() => setShowAllTx((v) => !v)} />
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <AppText variant="heading">{t.adminActions}</AppText>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          {shownAct.length ? shownAct.map((a, i) => (
            <View key={a.id} style={{ padding: 14, gap: 2, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <AppText variant="bodyStrong" style={{ fontSize: 15 }}>{String(a.action || '').replace(/_/g, ' ')}</AppText>
              <AppText variant="caption" color="muted">
                {[formatActivityMeta(a.metadata), formatTxDate(a.timestamp, lang, true)].filter(Boolean).join(' · ')}
              </AppText>
            </View>
          )) : (
            <AppText variant="body" color="muted" style={{ padding: 16 }}>{t.no_recent_activity}</AppText>
          )}
        </Card>
        {activities.length > LIMIT ? (
          <Button variant="ghost" title={showAllAct ? t.showLess : t.showAllN.replace('{n}', String(activities.length))} onPress={() => setShowAllAct((v) => !v)} />
        ) : null}
      </View>

      <Button variant="secondary" title={t.deleteAccount} onPress={handleDelete} style={{ borderColor: colors.error }} />
    </Screen>
  );
}
