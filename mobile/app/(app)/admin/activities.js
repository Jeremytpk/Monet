import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';
import { formatMoney } from '../../../lib/format';
import { describeTransaction } from '../../../lib/transactions';
import { AppText, Card, DetailRow, EmptyState, Header, Screen, Segmented, Sheet, StatusBadge, TransactionRow } from '../../../components/ui';
import { AdminSearch } from '../../../components/AdminSearch';
import { Sticker } from '../../../components/brand';

const CACHE_KEY = 'admin_activities_cache';
const FILTERS = {
  all: () => true,
  transfers: (type) => type === 'incoming_transfer' || type === 'outgoing_transfer',
  deposits: (type) => type === 'deposit',
  mobile: (type) => type === 'withdrawal',
  kiosk: (type) => type === 'kiosk_withdrawal',
};

const short = (id) => (id ? `${String(id).slice(0, 8)}…` : '');

export default function AdminActivitiesScreen() {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user || String(profile?.role || '').toLowerCase() !== 'admin') {
      Alert.alert(t.error, t.unauthorized_access);
      router.back();
      return;
    }

    (async () => {
      let hasCached = false;
      // Show the last snapshot instantly, then refresh.
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached).map((it) => ({ ...it, _date: new Date(it._date) }));
          setActivities(parsed);
          hasCached = true;
          setLoading(false);
        }
      } catch {}

      try {
        // Per-user queries avoid a collectionGroup index.
        const userSnap = await getDocs(query(collection(db, 'users'), orderBy('created_at', 'desc'), limit(200)));
        const userMap = new Map(userSnap.docs.map((d) => [d.id, d.data()]));
        const nameOf = (id) => (id ? userMap.get(id)?.name || null : null);

        const lists = await Promise.all(userSnap.docs.map(async (u) => {
          const snap = await getDocs(query(collection(db, 'users', u.id, 'transactions'), orderBy('timestamp', 'desc'), limit(25)));
          return snap.docs.map((d) => {
            const data = d.data();
            return {
              ...data,
              id: `${u.id}_${d.id}`,
              _date: data.timestamp?.toDate?.() || new Date(0),
              _owner_id: u.id,
              _owner_name: nameOf(u.id),
              _sender_name: nameOf(data.sender_id),
              _receiver_name: nameOf(data.receiver_id) || data.metadata?.mcp_name || null,
            };
          });
        }));
        const combined = lists.flat().sort((a, b) => b._date - a._date).slice(0, 200);
        setActivities(combined);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(combined)).catch(() => {});
      } catch (err) {
        console.error('Error fetching global activities:', err);
        if (!hasCached) Alert.alert(t.error, `${t.failed_load_activities}\n\n${err.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, profile]);

  function parties(item) {
    const incoming = item.type === 'incoming_transfer' || item.type === 'deposit';
    const owner = item._owner_name || short(item._owner_id);
    const from = incoming ? item._sender_name || short(item.sender_id) || t.system : owner;
    const to = incoming ? owner : item._receiver_name || short(item.receiver_id);
    return to ? `${from} → ${to}` : from;
  }

  const q = searchText.trim().toLowerCase();
  const visible = activities.filter((it) => {
    if (!FILTERS[filter](String(it.type || '').toLowerCase())) return false;
    if (!q) return true;
    return [it._owner_name, it._sender_name, it._receiver_name, it.gateway_ref, it._date?.toLocaleDateString?.()]
      .some((v) => String(v || '').toLowerCase().includes(q));
  });

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.globalActivity} subtitle={`${t.total_transactions} ${visible.length}`} />
      <AdminSearch value={searchText} onChangeText={setSearchText} placeholder={t.search_placeholder} />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t.all },
          { value: 'transfers', label: t.filterTransfers },
          { value: 'deposits', label: t.deposit },
          { value: 'mobile', label: t.mobile_money },
          { value: 'kiosk', label: t.kiosk },
        ]}
      />

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <Card padding={0} style={{ overflow: 'hidden' }}>
          {visible.length ? visible.map((item, i) => {
            const d = describeTransaction(item, t, lang);
            return (
              <View key={item.id}>
                {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 72 }} /> : null}
                <TransactionRow {...d} title={parties(item)} subtitle={`${d.title} · ${d.subtitle}`} onPress={() => setSelected(item)} />
              </View>
            );
          }) : (
            <EmptyState art={<Sticker name="mbote" size={88} />} title={t.no_recent_activity} />
          )}
        </Card>
      )}

      <Sheet visible={!!selected} onClose={() => setSelected(null)} title={t.activity_details}>
        {selected ? (
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 10 }}>
            <View style={{ alignItems: 'center', gap: 6, paddingBottom: 6 }}>
              <AppText variant="amount">{formatMoney(Number(selected.amount || 0))}</AppText>
              {selected.status ? <StatusBadge status={selected.status} label={t[selected.status]} /> : null}
              <AppText variant="body" color="muted">{parties(selected)}</AppText>
            </View>
            {Object.entries(selected)
              .filter(([k]) => !['withdrawal_code', 'code', 'kiosk_code', 'timestamp', 'id', 'amount', 'status'].includes(k))
              .map(([k, v]) => {
                const key = k.replace(/^_/, '');
                let value = k === '_date' ? new Date(v).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US') : typeof v === 'object' && v ? JSON.stringify(v) : String(v ?? '—');
                if ((k === 'type' || k === 'status') && typeof v === 'string') value = t[v.toLowerCase()] || v.replace(/_/g, ' ');
                return <DetailRow key={k} label={t[key] || key.replace(/_/g, ' ')} value={value} />;
              })}
          </ScrollView>
        ) : null}
      </Sheet>
    </Screen>
  );
}
