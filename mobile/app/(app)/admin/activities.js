import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';

export default function AdminActivitiesScreen() {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const styles = createStyles(colors);

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || String(profile?.role || '').toLowerCase() !== 'admin') {
      Alert.alert(t.error || 'Error', 'Unauthorized access.');
      router.back();
      return;
    }

    async function fetchGlobalActivity() {
      try {
        // Fetch transactions from each user's `transactions` subcollection.
        // This avoids a collectionGroup query (and its index) by querying per-user.
        const userQuery = query(collection(db, 'users'), orderBy('created_at', 'desc'), limit(200));
        const userSnap = await getDocs(userQuery);
        const userIds = userSnap.docs.map((d) => d.id);

        // Build a map of userId -> userData so we can show names instead of ids
        const userMap = new Map(userSnap.docs.map((d) => [d.id, d.data()]));

        // For each user, fetch their most recent transactions (limit per user to avoid heavy reads)
        const txPromises = userIds.map(async (uid) => {
          const txQ = query(collection(db, 'users', uid, 'transactions'), orderBy('timestamp', 'desc'), limit(25));
          const snap = await getDocs(txQ);
          return snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            _type: 'transaction',
            _date: d.data().timestamp?.toDate() || new Date(0),
            _owner_id: uid,
            _owner_name: (userMap.get(uid)?.name) || (userMap.get(uid)?.displayName) || null,
          }));
        });

        const txArrays = await Promise.all(txPromises);
        const txList = txArrays.flat();

        // Sort transactions newest-first and show them as the combined list
        const combined = txList.sort((a, b) => b._date - a._date).slice(0, 200);
        setActivities(combined);
      } catch (err) {
        console.error('Error fetching global activities:', err);
        Alert.alert(
          t.error || 'Error',
          `Failed to load activities. Check the console for the index link, or deploy firestore.indexes.json.\n\nDetails: ${err.message}`
        );
      } finally {
        setLoading(false);
      }
    }

    fetchGlobalActivity();
  }, [user, profile]);

  const formatDate = (date) => {
    return date.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const renderItem = ({ item }) => {
    if (item._type === 'user') {
      return (
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Ionicons name="person-add" size={24} color="#3B82F6" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>New User Registration</Text>
            <Text style={styles.cardSubtitle}>{item.name || 'No Name'} • {item.phone || 'No Phone'}</Text>
            <Text style={styles.cardDate}>{formatDate(item._date)}</Text>
          </View>
        </View>
      );
    }

    // Transaction styling mapping
    let iconName = 'swap-horizontal';
    let iconColor = colors.accent;
    let bgOpacity = colors.isDark ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.15)';

    const tType = (item.type || '').toLowerCase();

    if (tType === 'deposit' || tType === 'incoming_transfer') {
      iconName = 'arrow-down';
      iconColor = '#22C55E'; // Green
      bgOpacity = 'rgba(34, 197, 94, 0.15)';
    } else if (tType === 'withdrawal' || tType === 'kiosk_withdrawal' || tType === 'outgoing_transfer') {
      iconName = 'arrow-up';
      iconColor = '#EF4444'; // Red
      bgOpacity = 'rgba(239, 68, 68, 0.15)';
    } else if (tType.includes('top_up') || tType.includes('topup')) {
      iconName = 'phone-portrait-outline';
      iconColor = '#3B82F6'; // Blue
      bgOpacity = 'rgba(59, 130, 246, 0.15)';
    } else if (tType.includes('mobile_money') || tType.includes('mobile')) {
      iconName = 'phone-landscape-outline';
      iconColor = '#F97316'; // Orange
      bgOpacity = 'rgba(249, 115, 22, 0.15)';
    }

    const userId = item.sender_id || item._owner_id;
    const userLabel = item._owner_name
      ? item._owner_name
      : userId
      ? userId.slice(0, 8) + '...'
      : 'System';
    const receiverLabel = item.receiver_id ? item.receiver_id.slice(0, 8) + '...' : '';

    return (
      <View style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: bgOpacity }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>
            {item.type ? item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Transaction'}
          </Text>
          <Text style={styles.cardSubtitle}>
            Amount: ${Number(item.amount || 0).toFixed(2)} • Status: {item.status || 'N/A'}
            {item.provider ? ` • ${item.provider}` : ''}
          </Text>
          <Text style={styles.cardSubtitle}>
            By: {userLabel} {receiverLabel ? `→ To: ${receiverLabel}` : ''}
          </Text>
          <Text style={styles.cardDate}>{formatDate(item._date)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Global Activity</Text>
          <Text style={styles.headerSubtitle}>Admin Dashboard</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id + item._type}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.emptyText}>No recent activity found.</Text>}
        />
      )}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    backBtn: { marginRight: 16, padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    emptyText: { textAlign: 'center', color: colors.muted, marginTop: 32, fontSize: 15 },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
    cardSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
    cardDate: { fontSize: 12, color: colors.muted, marginTop: 4 },
  });
}