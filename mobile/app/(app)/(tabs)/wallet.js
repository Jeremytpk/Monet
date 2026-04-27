import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/useAuth';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/LanguageContext';

const BANNER_GAP = 14;
const BANNER_SLIDE_WIDTH = Dimensions.get('window').width - 48 - BANNER_GAP;
const BANNER_PAGE_WIDTH = BANNER_SLIDE_WIDTH + BANNER_GAP;
const BANNER_WIDTH = BANNER_SLIDE_WIDTH;
const BANNER_HEIGHT = 140;
const AUTO_SWIPE_INTERVAL = 4000;

const BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
];

export default function WalletScreen() {
  const { user, profile, setProfile } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, toggleLang, t } = useLanguage();
  const balance = profile?.wallet_balance ?? 0;
  const currency = profile?.currency ?? 'USD';
  const bannerRef = useRef(null);
  const [bannerIndex, setBannerIndex] = useState(0);

  const banners = [
    { id: '1', imageUri: BANNER_IMAGES[0], title: t.banner1Title, subtitle: t.banner1Subtitle },
    { id: '2', imageUri: BANNER_IMAGES[1], title: t.banner2Title, subtitle: t.banner2Subtitle },
    { id: '3', imageUri: BANNER_IMAGES[2], title: t.banner3Title, subtitle: t.banner3Subtitle },
  ];

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const t = setInterval(() => {
      setBannerIndex((i) => {
        const next = (i + 1) % BANNER_IMAGES.length;
        bannerRef.current?.scrollTo({ x: next * BANNER_PAGE_WIDTH, animated: true });
        return next;
      });
    }, AUTO_SWIPE_INTERVAL);
    return () => clearInterval(t);
  }, []);

  function handleProfilePress() {
    if (user) {
      router.push('/(app)/profile');
    } else {
      router.push('/(app)/login');
    }
  }

  function onBannerScroll(e) {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / BANNER_PAGE_WIDTH);
    if (index >= 0 && index < BANNER_IMAGES.length) setBannerIndex(index);
  }

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Ionicons name="wallet" size={24} color={colors.accent} />
          </View>
          <Text style={styles.brandName}>Monet</Text>
        </View>
        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={toggleLang} style={styles.langButton} hitSlop={12}>
            <Text style={styles.langButtonText}>{lang === 'en' ? 'FR' : 'EN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleProfilePress} style={styles.profileButton} hitSlop={12}>
            {user && (profile?.photoURL || profile?.photoUrl || user?.photoURL) ? (
              <Image
                source={{ uri: profile?.photoURL || profile?.photoUrl || user?.photoURL }}
                style={styles.profileAvatar}
              />
            ) : (
              <Ionicons name={user ? 'person-circle' : 'person-circle-outline'} size={32} color={colors.accent} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bannerWrap}>
        <ScrollView
          ref={bannerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onBannerScroll}
          onScrollBeginDrag={() => {}}
          decelerationRate="fast"
          snapToInterval={BANNER_PAGE_WIDTH}
          snapToAlignment="start"
          contentContainerStyle={styles.bannerContent}
        >
          {banners.map((b) => (
            <TouchableOpacity key={b.id} style={styles.bannerSlide} activeOpacity={1}>
              <Image source={{ uri: b.imageUri }} style={styles.bannerImage} />
              <View style={styles.bannerOverlay} />
              <View style={styles.bannerTextWrap}>
                <Text style={styles.bannerTitle}>{b.title}</Text>
                <Text style={styles.bannerSubtitle}>{b.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.bannerDots}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[styles.bannerDot, i === bannerIndex && styles.bannerDotActive]}
            />
          ))}
        </View>
      </View>

      <View style={styles.balanceSection}>
        <Text style={styles.greeting}>{t.yourBalance}</Text>
        <Text style={styles.balance}>
          $ {balance.toFixed(2)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.addMoneyButton}
        onPress={() => router.push('/(app)/add-money')}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={22} color={colors.accent} style={styles.primaryButtonIcon} />
        <View>
          <Text style={styles.addMoneyButtonText}>{t.addMoney}</Text>
          <Text style={styles.addMoneyButtonSubtext}>{t.addMoneySubtext}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/(app)/withdraw')}
        activeOpacity={0.85}
      >
        <Ionicons name="phone-portrait-outline" size={22} color={colors.accentText} style={styles.primaryButtonIcon} />
        <View>
          <Text style={styles.primaryButtonText}>{t.transferMobile}</Text>
          <Text style={styles.primaryButtonSubtext}>{t.transferMobileSubtext}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push('/(app)/(tabs)/activity')}
        activeOpacity={0.85}
      >
        <Ionicons name="time-outline" size={22} color={colors.accent} />
        <Text style={styles.secondaryButtonText}>{t.recentActivity}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingTop: 56, paddingBottom: 32 },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    logoIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.isDark ? 'rgba(13, 148, 136, 0.25)' : 'rgba(13, 148, 136, 0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandName: {
      fontSize: 23,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
    },
    topBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    langButton: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    langButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
      letterSpacing: 0.5,
    },
    profileButton: { padding: 4 },
    profileAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    bannerWrap: {
      marginBottom: 28,
      marginHorizontal: -24,
    },
    bannerContent: {
      paddingHorizontal: 24,
    },
    bannerSlide: {
      width: BANNER_WIDTH,
      height: BANNER_HEIGHT,
      marginRight: BANNER_GAP,
      borderRadius: 20,
      overflow: 'hidden',
    },
    bannerImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    bannerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    bannerTextWrap: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 16,
    },
    bannerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 2,
    },
    bannerSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.9)',
    },
    bannerDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
    },
    bannerDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
    },
    bannerDotActive: {
      width: 20,
      backgroundColor: colors.accent,
    },
    balanceSection: {
      marginBottom: 28,
      paddingVertical: 20,
      paddingHorizontal: 24,
      borderRadius: 24,
      backgroundColor: colors.isDark ? 'rgba(13, 148, 136, 0.12)' : 'rgba(13, 148, 136, 0.08)',
      borderWidth: 1,
      borderColor: colors.isDark ? 'rgba(13, 148, 136, 0.2)' : 'rgba(13, 148, 136, 0.15)',
    },
    greeting: {
      fontSize: 13,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 6,
    },
    balance: {
      fontSize: 40,
      fontWeight: '800',
      color: colors.accent,
      letterSpacing: -1,
    },
    addMoneyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 22,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addMoneyButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    addMoneyButtonSubtext: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 20,
      padding: 22,
      marginBottom: 14,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    primaryButtonIcon: {
      marginRight: 14,
    },
    primaryButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.accentText,
    },
    primaryButtonSubtext: {
      fontSize: 13,
      color: colors.accentText,
      opacity: 0.85,
      marginTop: 2,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
    },
  });
}
