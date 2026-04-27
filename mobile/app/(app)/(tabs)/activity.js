import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';

export default function ActivityScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const styles = createStyles(colors);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  if (!user) {
    return <GuestPrompt colors={colors} t={t} router={router} />;
  }

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'transactions'),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setTransactions(list);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  function formatDate(ts) {
    if (!ts?.toDate) return '—';
    const d = ts.toDate();
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.recentActivity}</Text>
        <Text style={styles.subtitle}>{t.moneyInOut}</Text>
      </View>
      <FlatList
        data={transactions}
        keyExtractor={(tx) => tx.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>{t.noTransactions}</Text>
        }
        renderItem={({ item }) => {
          const isIn = item.type === 'incoming_transfer' || item.type === 'deposit';
          const isOut = item.type === 'withdrawal';
          const amount = item.amount ?? 0;
          const label = isOut ? t.withdrawal : isIn ? t.received : t.transfer;
          return (
            <View style={styles.row}>
              <View style={[styles.dot, isIn ? styles.dotIn : styles.dotOut]} />
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowDate}>{formatDate(item.timestamp)}</Text>
              </View>
              <Text style={[styles.rowAmount, isIn ? styles.amountIn : styles.amountOut]}>
                {isIn ? '+' : '-'} ${amount.toFixed(2)}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

function GuestPrompt({ colors, t, router }) {
  const styles = createStyles(colors);
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.guestContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t.tabActivity}</Text>
      <View style={styles.guestCard}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.muted} style={styles.guestIcon} />
        <Text style={styles.guestTitle}>{t.signInToAccessSettings}</Text>
        <Text style={styles.guestMessage}>{t.signInMessage}</Text>
        <TouchableOpacity
          style={styles.guestButton}
          onPress={() => router.push('/(app)/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.guestButtonText}>{t.logIn}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { justifyContent: 'center' },
    header: { padding: 24, paddingTop: 56 },
    title: { fontSize: 28, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
    list: { padding: 24, paddingTop: 16 },
    empty: { color: colors.muted, fontSize: 16, textAlign: 'center', marginTop: 32 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 14 },
    dotIn: { backgroundColor: '#22C55E' },
    dotOut: { backgroundColor: colors.accent },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
    rowDate: { fontSize: 13, color: colors.muted, marginTop: 2 },
    rowAmount: { fontSize: 17, fontWeight: '700' },
    amountIn: { color: '#22C55E' },
    amountOut: { color: colors.text },
    guestContent: {
      flexGrow: 1,
      padding: 24,
      paddingTop: 56,
    },
    guestCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: 'center',
      marginTop: 24,
    },
    guestIcon: { marginBottom: 16 },
    guestTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
      textAlign: 'center',
    },
    guestMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    guestButton: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 14,
    },
    guestButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.accentText,
    },
  });
}
