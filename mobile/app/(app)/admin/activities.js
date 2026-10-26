import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const { t, lang } = useLanguage();
  const router = useRouter();
  const styles = createStyles(colors);

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!user || String(profile?.role || '').toLowerCase() !== 'admin') {
      Alert.alert(t.error || 'Error', t.unauthorized_access || 'Unauthorized access.');
      router.back();
      return;
    }

    async function fetchGlobalActivity() {
      let hasCachedData = false;
      // 1. Try loading from local cache for instant UI rendering
      try {
        const cachedData = await AsyncStorage.getItem('admin_activities_cache');
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          // Rehydrate Date objects
          parsed.forEach((item) => {
            if (item._date) item._date = new Date(item._date);
          });
          setActivities(parsed);
          hasCachedData = true;
          setLoading(false); // Render UI immediately using cache
        }
      } catch (cacheErr) {
        console.log('Cache read error:', cacheErr);
      }

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
          return snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              _type: 'transaction',
              _date: data.timestamp?.toDate() || new Date(0),
              _owner_id: uid,
              _owner_name: (userMap.get(uid)?.name) || (userMap.get(uid)?.displayName) || null,
              _receiver_name: data.receiver_id ? (userMap.get(data.receiver_id)?.name || userMap.get(data.receiver_id)?.displayName) : null,
              _sender_name: data.sender_id ? (userMap.get(data.sender_id)?.name || userMap.get(data.sender_id)?.displayName) : null,
              _mcp_name: data.mcp_id ? (userMap.get(data.mcp_id)?.name || userMap.get(data.mcp_id)?.displayName) : null,
            };
          });
        });

        const txArrays = await Promise.all(txPromises);
        const txList = txArrays.flat();

        // Sort transactions newest-first and show them as the combined list
        const combined = txList.sort((a, b) => b._date - a._date).slice(0, 200);
        setActivities(combined);

        // 2. Save fresh data to cache in the background
        try {
          await AsyncStorage.setItem('admin_activities_cache', JSON.stringify(combined));
        } catch (cacheSaveErr) {
          console.log('Cache save error:', cacheSaveErr);
        }
      } catch (err) {
        console.error('Error fetching global activities:', err);
        if (!hasCachedData) {
          Alert.alert(
            t.error || 'Error',
            `${t.failed_load_activities || 'Failed to load activities.'}\n\nDetails: ${err.message}`
          );
        }
      } finally {
        setLoading(false);
      }
    }

    fetchGlobalActivity();
  }, [user, profile]);

  const formatDate = (date) => {
    return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const openModal = (item) => {
    setSelectedActivity(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedActivity(null);
  };
  
  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'completed' || s === 'success') return '#22C55E'; // Green
    if (s === 'pending') return '#F59E0B'; // Amber
    if (s === 'failed' || s === 'cancelled') return '#EF4444'; // Red
    return colors.textSecondary; // Default gray
  };

  const renderItem = ({ item }) => {
    if (item._type === 'user') {
      return (
        <TouchableOpacity onPress={() => openModal(item)} style={styles.card} activeOpacity={0.8}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Ionicons name="person-add" size={24} color="#3B82F6" />
          </View>
          <View style={styles.cardMain}>
            <Text style={styles.participantText} numberOfLines={1}>{t.new_user_registration || 'New User Registration'}</Text>
            <Text style={styles.cardSubtitle}>{item.name || t.no_name || 'No Name'} • {item.phone || t.no_phone || 'No Phone'}</Text>
            <Text style={styles.cardDate}>{formatDate(item._date)}</Text>
          </View>
        </TouchableOpacity>
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

    let senderName = '';
    let receiverName = '';

    const isIncoming = tType === 'incoming_transfer' || tType === 'deposit';

    if (isIncoming) {
      senderName = item.sender_name || item._sender_name || (item.sender_id ? item.sender_id.slice(0, 8) + '...' : t.system || 'System');
      receiverName = item._owner_name || (item._owner_id ? item._owner_id.slice(0, 8) + '...' : '');
    } else {
      senderName = item._owner_name || (item._owner_id ? item._owner_id.slice(0, 8) + '...' : t.system || 'System');
      receiverName = item.receiver_name || item._receiver_name || (item.receiver_id ? item.receiver_id.slice(0, 8) + '...' : '');
    }

    if (tType.includes('kiosk') || item.kiosk_name || item.kiosk || item.mcp_id) {
      const mcpTarget = item._mcp_name || item.kiosk_name || item.kiosk?.name || (item.mcp_id ? String(item.mcp_id) : '');
      if (mcpTarget) {
        if (isIncoming) {
          senderName = mcpTarget;
        } else {
          receiverName = mcpTarget;
        }
      }
    }

    return (
      <TouchableOpacity onPress={() => openModal(item)} style={styles.card} activeOpacity={0.8}>
        <View style={[styles.iconWrap, { backgroundColor: bgOpacity }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        
        <View style={styles.cardMain}>
          <View style={styles.participantRow}>
            <Text style={styles.participantText} numberOfLines={1} ellipsizeMode="tail">{senderName}</Text>
            {receiverName ? (
              <>
                <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} style={{ marginHorizontal: 6 }} />
                <Text style={styles.participantText} numberOfLines={1} ellipsizeMode="tail">{receiverName}</Text>
              </>
            ) : null}
          </View>
          <Text style={styles.cardSubtitle}>
            {t[tType] || (item.type ? item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : (t.transaction || 'Transaction'))}
            {item.provider ? ` • ${item.provider}` : ''}
          </Text>
          <Text style={styles.cardDate}>{formatDate(item._date)}</Text>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.amountText}>
            ${Number(item.amount || 0).toFixed(2)}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + '1A' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status ? (t[item.status.toLowerCase()] || item.status).toUpperCase() : (t.na || 'N/A')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Filter data based on search text and selected filter type
  const filteredActivities = activities.filter((it) => {
    // 1. Text Search Filter
    let matchesSearch = true;
    if (searchText) {
      const q = searchText.toLowerCase();
      const owner = (it._owner_name || '').toLowerCase();
      const kiosk = ((it.kiosk_name || it.kiosk?.name) || '').toLowerCase();
      const dateStr = formatDate(it._date).toLowerCase();
      matchesSearch = owner.includes(q) || kiosk.includes(q) || dateStr.includes(q);
    }

    // 2. Type Filter
    let matchesType = true;
    if (filterType !== 'All') {
      const tType = (it.type || '').toLowerCase();
      if (filterType === 'Kiosk') {
        matchesType = tType === 'withdrawal' || tType === 'kiosk_withdrawal';
      } else if (filterType === 'Mobile Money') {
        matchesType = tType.includes('mobile_money') || tType.includes('mobile');
      } else if (filterType === 'Top Up') {
        matchesType = tType.includes('top_up') || tType.includes('topup');
      }
    }

    return matchesSearch && matchesType;
  });

  const filterOptions = [
    { id: 'All', label: t.all || 'All' },
    { id: 'Kiosk', label: t.kiosk || 'Kiosk' },
    { id: 'Mobile Money', label: t.mobile_money || 'Mobile Money' },
    { id: 'Top Up', label: t.top_up || 'Top Up' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          placeholder={t.search_placeholder || "Search by user, kiosk, date..."}
          placeholderTextColor={colors.muted}
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          {filterOptions.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, filterType === f.id && { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={() => setFilterType(f.id)}
            >
              <Text style={[styles.filterChipText, filterType === f.id && { color: colors.accentText }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.summaryText}>
          {t.total_transactions || 'Total Transactions:'} <Text style={{ color: colors.text }}>{filteredActivities.length}</Text>
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id + item._type}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.emptyText}>{t.no_recent_activity || 'No recent activity found.'}</Text>}
        />
      )}

      {/* Details modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t.activity_details || 'Activity Details'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Text style={{ color: colors.accent, fontWeight: '600' }}>{t.close || 'Close'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedActivity ? (
                Object.entries(selectedActivity).map(([k, v]) => {
                  if (['withdrawal_code', 'code', 'kiosk_code'].includes(k)) return null;
                  let value = v;
                  if (k === 'timestamp' || k === '_date') value = formatDate(selectedActivity._date || new Date(0));
                  if (typeof value === 'object') value = JSON.stringify(value);
                  
                  // Translate and format the key
                  const cleanKey = k.replace(/^_/, '');
                  const displayKey = t[cleanKey] || cleanKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  
                  // Translate specific enum-like string values (status, type)
                  let displayValue = String(value);
                  if ((k === 'status' || k === 'type') && typeof v === 'string') {
                    displayValue = t[v.toLowerCase()] || v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  }

                  return (
                    <View key={k} style={styles.detailRow}>
                      <Text style={[styles.detailKey, { color: colors.textSecondary }]}>{displayKey}</Text>
                      <Text style={[styles.detailVal, { color: colors.text }]}>{displayValue}</Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>{t.no_details || 'No details'}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.03)',
    },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    cardMain: { flex: 1, paddingRight: 8 },
    participantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    participantText: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
    cardSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 3 },
    cardDate: { fontSize: 12, color: colors.muted },
    cardRight: { alignItems: 'flex-end', justifyContent: 'center' },
    amountText: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    searchWrap: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInput: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterScroll: { marginTop: 12 },
    filterContent: { gap: 8, paddingBottom: 4 },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterChipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
    summaryText: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxHeight: '80%',
      borderRadius: 16,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalBody: { padding: 16 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    detailKey: { fontSize: 14, flex: 1 },
    detailVal: { fontSize: 14, fontWeight: '500', flex: 2, textAlign: 'right' },
  });
}