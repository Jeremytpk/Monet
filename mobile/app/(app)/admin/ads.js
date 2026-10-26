import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, Switch, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useTheme } from '../../../lib/ThemeContext';
import { useAuth } from '../../../lib/useAuth';
import { useLanguage } from '../../../lib/LanguageContext';
import { db } from '../../../lib/firebase';
import { adminCreateAd, adminUpdateAd, adminDeleteAd, adminUploadAdImage } from '../../../lib/functions';
import { AppText, Button, Card, EmptyState, Header, Icon, IconButton, PromoCarousel, Screen, Sheet, TextField } from '../../../components/ui';

export default function AdminAds() {
  const { colors, radii } = useTheme();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [ads, setAds] = useState([]);
  const [composerVisible, setComposerVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(query(collection(db, 'ads'), orderBy('created_at', 'desc')),
      (snap) => setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.warn('ads onSnapshot error', err));
    return () => unsub();
  }, [isAdmin]);

  if (!isAdmin) return null;

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.permissionNeeded, t.galleryPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets?.[0]?.uri) setImageUri(result.assets[0].uri);
  }

  async function handleCreate() {
    if (!title.trim() || !message.trim()) {
      Alert.alert(t.required, t.adFieldsRequired);
      return;
    }
    setSaving(true);
    try {
      let image_url = null;
      if (imageUri) {
        const blob = await (await fetch(imageUri)).blob();
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = reject;
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.readAsDataURL(blob);
        });
        const result = await adminUploadAdImage(base64, blob.type || 'image/jpeg');
        image_url = result?.url || null;
      }
      await adminCreateAd({ title: title.trim(), message: message.trim(), image_url });
      setTitle('');
      setMessage('');
      setImageUri(null);
      setComposerVisible(false);
    } catch (err) {
      Alert.alert(t.error, err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(ad, active) {
    try {
      await adminUpdateAd(ad.id, { active });
    } catch (err) {
      Alert.alert(t.error, err.message || String(err));
    }
  }

  function handleDelete(ad) {
    Alert.alert(t.deleteAd, t.deleteAdMsg, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: () => adminDeleteAd(ad.id).catch((err) => Alert.alert(t.error, err.message || String(err))) },
    ]);
  }

  return (
    <Screen edges={['top', 'bottom']} footer={
      <Button title={t.newAd} icon={<Icon name="plus" size={18} color={colors.accentText} />} onPress={() => setComposerVisible(true)} />
    }>
      <Header title={t.adminAds} subtitle={t.adminAdsSubtitle} />

      {ads.length ? ads.map((ad) => (
        <Card key={ad.id} padding={14} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {ad.image_url ? (
              <Image source={{ uri: ad.image_url }} style={{ width: 56, height: 56, borderRadius: radii.chip, backgroundColor: colors.accentSoft }} />
            ) : (
              <View style={{ width: 56, height: 56, borderRadius: radii.chip, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="megaphone" size={24} color="accent" />
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong" numberOfLines={1}>{ad.title}</AppText>
              <AppText variant="caption" color="muted" numberOfLines={2}>{ad.message}</AppText>
            </View>
            <IconButton icon="trash" label={t.deleteAd} variant="plain" onPress={() => handleDelete(ad)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            <AppText variant="label" color={ad.active ? 'accent' : 'muted'}>{ad.active ? t.adLive : t.adHidden}</AppText>
            <Switch
              accessibilityLabel={t.adLive}
              value={ad.active === true}
              onValueChange={(v) => toggleActive(ad, v)}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>
      )) : (
        <Card><EmptyState icon="megaphone" title={t.noAds} message={t.noAdsHint} /></Card>
      )}

      <Sheet visible={composerVisible} onClose={() => setComposerVisible(false)} title={t.newAd}>
        <AppText variant="label" color="muted">{t.preview}</AppText>
        <PromoCarousel items={[{ id: 'preview', title: title || t.adTitlePlaceholder, subtitle: message || t.adMessagePlaceholder, imageUri, icon: 'megaphone' }]} />
        <TextField label={t.adTitle} value={title} onChangeText={setTitle} maxLength={60} placeholder={t.adTitlePlaceholder} />
        <TextField label={t.adMessage} value={message} onChangeText={setMessage} maxLength={120} placeholder={t.adMessagePlaceholder} />
        <Pressable
          accessibilityRole="button"
          onPress={imageUri ? () => setImageUri(null) : pickImage}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: radii.control, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.accentSoft : colors.card })}
        >
          <Icon name={imageUri ? 'trash' : 'image'} size={20} color="accent" />
          <AppText variant="label">{imageUri ? t.removeImage : t.addImage}</AppText>
        </Pressable>
        <Button title={t.publishAd} onPress={handleCreate} loading={saving} />
      </Sheet>
    </Screen>
  );
}
