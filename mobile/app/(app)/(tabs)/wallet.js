import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';
import { formatMoney } from '../../../lib/format';
import { describeTransaction } from '../../../lib/transactions';
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  Icon,
  Logo,
  PromoCarousel,
  QuickAction,
  Screen,
  TransactionRow,
} from '../../../components/ui';
import { GuestPrompt } from '../../../components/GuestPrompt';
import { Scene, Sticker } from '../../../components/brand';

export default function WalletScreen() {
  const { user, profile, setProfile } = useAuth();
  const router = useRouter();
  const { colors, radii, isDark } = useTheme();
  const { lang, toggleLang, t } = useLanguage();
  const [ads, setAds] = useState(null);
  const [recent, setRecent] = useState([]);
  const [hideBalance, setHideBalance] = useState(false);
  const balance = Number(profile?.wallet_balance ?? 0);
  const firstName = (profile?.name || '').trim().split(/\s+/)[0];
  const photo = profile?.photoURL || profile?.photoUrl || user?.photoURL;

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data());
    }, (err) => { console.warn('wallet profile onSnapshot error', err); });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setRecent([]);
      return;
    }
    const q = query(collection(db, 'users', user.uid, 'transactions'), orderBy('timestamp', 'desc'), limit(4));
    const unsub = onSnapshot(q, (snap) => setRecent(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.warn('wallet recent onSnapshot error', err));
    return () => unsub();
  }, [user?.uid]);

  // Ads are ordered server-side and filtered for `active` client-side (avoids a composite index).
  useEffect(() => {
    const q = query(collection(db, 'ads'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((it) => it.active === true);
      setAds(items.map((it) => ({ id: it.id, title: it.title || '', subtitle: it.message || '', imageUri: it.image_url || null })));
    }, (err) => { console.warn('ads banner onSnapshot error', err); });
    return () => unsub();
  }, []);

  const defaultPromos = [
    { id: 'p1', title: t.banner1Title, subtitle: t.banner1Subtitle, icon: 'send' },
    { id: 'p2', title: t.banner2Title, subtitle: t.banner2Subtitle, icon: 'phone' },
    { id: 'p3', title: t.banner3Title, subtitle: t.banner3Subtitle, icon: 'shield' },
  ];
  const promos = ads && ads.length ? ads : defaultPromos;

  const topBar = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Logo size={32} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={lang === 'en' ? 'Passer en français' : 'Switch to English'}
          onPress={toggleLang}
          style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Icon name="globe" size={16} color="muted" />
          <AppText variant="label">{lang === 'en' ? 'FR' : 'EN'}</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={user ? t.profile : t.logIn}
          onPress={() => router.push(user ? '/(app)/profile' : '/(app)/login')}
          hitSlop={4}
        >
          {user ? <Avatar name={profile?.name} uri={photo} size={44} /> : (
            <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="user" size={20} />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );

  if (!user) {
    return (
      <Screen>
        {topBar}
        <GuestPrompt
          tone="brand"
          art={<Scene name="bridge" width={320} dark />}
          title={t.guestWalletTitle}
          message={t.guestWalletMsg}
        />
        <View style={{ gap: 12 }}>
          <AppText variant="heading" accessibilityRole="header">{t.howItWorks}</AppText>
          {[
            { sticker: 'topup', title: t.how1Title, body: t.how1Body },
            { sticker: 'sent', title: t.how2Title, body: t.how2Body },
            { sticker: 'cash', title: t.how3Title, body: t.how3Body },
          ].map((s) => (
            <View key={s.sticker} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Sticker name={s.sticker} size={56} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyStrong">{s.title}</AppText>
                <AppText variant="caption" color="muted" style={{ fontSize: 14, lineHeight: 20 }}>{s.body}</AppText>
              </View>
            </View>
          ))}
        </View>
        <PromoCarousel items={promos} />
      </Screen>
    );
  }

  const onBrand = isDark ? colors.background : colors.accentText;

  return (
    <Screen>
      {topBar}

      <View style={{ gap: 2 }}>
        <AppText variant="body" color="muted">{t.greeting}{firstName ? ',' : ''}</AppText>
        {firstName ? <AppText variant="title">{firstName}</AppText> : null}
      </View>

      <Card tone="brand" padding={22} style={{ gap: 18, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="label" style={{ color: onBrand, opacity: 0.85 }}>{t.yourBalance}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hideBalance ? t.show : t.hide}
            onPress={() => setHideBalance((v) => !v)}
            hitSlop={10}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name={hideBalance ? 'eye-off' : 'eye'} size={20} color={onBrand} />
          </Pressable>
        </View>
        <AppText variant="amount" style={{ color: onBrand }} accessibilityLabel={hideBalance ? t.hidden : formatMoney(balance)}>
          {hideBalance ? '$ • • • •' : formatMoney(balance)}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title={t.tabSend}
            icon={<Icon name="send" size={18} color={colors.accent} />}
            variant="secondary"
            onPress={() => router.push('/(app)/(tabs)/send')}
            style={{ flex: 1, borderWidth: 0, minHeight: 48 }}
          />
          <Button
            title={t.addMoney}
            icon={<Icon name="plus" size={18} color={onBrand} />}
            onPress={() => router.push('/(app)/add-money')}
            style={{ flex: 1, minHeight: 48, backgroundColor: colors.accentPressed }}
          />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <QuickAction icon="phone" label={t.qaMobileMoney} onPress={() => router.push('/(app)/mobile-money')} />
        <QuickAction icon="kiosk" label={t.qaKiosk} tone="highlight" onPress={() => router.push('/(app)/kiosk-withdraw')} />
        <QuickAction icon="card" label={t.qaCards} onPress={() => router.push('/(app)/payment-methods')} />
      </View>

      <PromoCarousel items={promos} />

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="heading" accessibilityRole="header">{t.recentActivity}</AppText>
          <Pressable accessibilityRole="link" onPress={() => router.push('/(app)/(tabs)/activity')} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
            <AppText variant="label" color="accent">{t.seeAll}</AppText>
          </Pressable>
        </View>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          {recent.length ? recent.map((tx, i) => {
            const d = describeTransaction(tx, t, lang);
            return (
              <View key={tx.id}>
                {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 72 }} /> : null}
                <TransactionRow {...d} onPress={() => router.push('/(app)/(tabs)/activity')} />
              </View>
            );
          }) : (
            <EmptyState art={<Sticker name="mbote" size={88} />} title={t.walletEmptyTitle} message={t.walletEmptyMsg} actionLabel={t.tabSend} onAction={() => router.push('/(app)/(tabs)/send')} />
          )}
        </Card>
      </View>
    </Screen>
  );
}
