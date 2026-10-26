import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../lib/firebase';
import { useAuth } from '../../lib/useAuth';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';
import { AppText, Avatar, Button, Header, Icon, ListGroup, ListItem, Screen, Sheet, TextField } from '../../components/ui';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, setProfile, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/(auth)/login');
  }, [user, authLoading]);

  const photoUrl = profile?.photoURL || profile?.photoUrl;
  const editable = { name: t.fieldName, phone: t.fieldPhone };

  function openEdit(field) {
    setEditValue(profile?.[field] || '');
    setEditingField(field);
  }

  async function saveEdit() {
    if (!user?.uid || !editingField) return;
    setSaving(true);
    try {
      const value = editValue.trim() || null;
      await updateDoc(doc(db, 'users', user.uid), { [editingField]: value, updated_at: serverTimestamp() });
      setProfile((p) => (p ? { ...p, [editingField]: value } : null));
      setEditingField(null);
    } catch (e) {
      Alert.alert(t.error, e.message || t.errCouldNotUpdate);
    } finally {
      setSaving(false);
    }
  }

  function showPhotoOptions() {
    Alert.alert(t.profilePhoto, t.profilePhotoMsg, [
      { text: t.takePhoto, onPress: () => pickPhoto('camera') },
      { text: t.chooseFromGallery, onPress: () => pickPhoto('library') },
      ...(photoUrl ? [{ text: t.removePhoto, onPress: handleRemovePhoto, style: 'destructive' }] : []),
      { text: t.cancel, style: 'cancel' },
    ]);
  }

  async function pickPhoto(source) {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(t.permissionNeeded, source === 'camera' ? t.cameraPermission : t.galleryPermission);
      return;
    }
    const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]?.uri) await uploadAndSetPhoto(result.assets[0].uri);
  }

  async function uploadAndSetPhoto(uri) {
    if (!user?.uid) return;
    setUploadingPhoto(true);
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      const storageRef = ref(storage, `users/${user.uid}/avatar.jpg`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const photoURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.uid), { photoURL, updated_at: serverTimestamp() });
      setProfile((p) => (p ? { ...p, photoURL } : null));
    } catch (e) {
      Alert.alert(t.error, e.message || t.errUploadPhoto);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    if (!user?.uid) return;
    setUploadingPhoto(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { photoURL: null, updated_at: serverTimestamp() });
      setProfile((p) => (p ? { ...p, photoURL: null } : null));
    } catch (e) {
      Alert.alert(t.error, e.message || t.errRemovePhoto);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/(app)/(tabs)/wallet');
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.profile} large={false} />

      <View style={{ alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.profilePhoto}
          onPress={showPhotoOptions}
          disabled={uploadingPhoto}
        >
          <Avatar name={profile?.name || user?.email} uri={photoUrl} size={112} />
          <View style={{ position: 'absolute', right: 0, bottom: 0, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
            {uploadingPhoto ? <ActivityIndicator size="small" color={colors.accentText} /> : <Icon name="camera" size={18} color={colors.accentText} />}
          </View>
        </Pressable>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <AppText variant="title">{profile?.name || '—'}</AppText>
          <AppText variant="body" color="muted">{user?.email}</AppText>
        </View>
      </View>

      <ListGroup title={t.personalInfo}>
        <ListItem icon="user" title={t.fieldName} subtitle={profile?.name || '—'} onPress={() => openEdit('name')} />
        <ListItem icon="phone" title={t.fieldPhone} subtitle={profile?.phone || '—'} onPress={() => openEdit('phone')} />
        <ListItem icon="mail" title={t.fieldEmail} subtitle={user?.email || '—'} onPress={() => Alert.alert(t.fieldEmail, t.editEmailMsg)} />
      </ListGroup>

      <ListGroup title={t.walletSection}>
        <ListItem icon="wallet" tone="neutral" title={t.fieldWalletId} subtitle={profile?.wallet_id || '—'} />
        <ListItem icon="cash" tone="neutral" title={t.fieldCurrency} value={profile?.currency || 'USD'} />
        {profile?.mcp_id ? <ListItem icon="kiosk" tone="highlight" title={t.fieldMcpId} value={profile.mcp_id} /> : null}
      </ListGroup>

      <ListGroup>
        <ListItem icon="logout" title={t.signOut} destructive onPress={handleSignOut} right={<View />} />
      </ListGroup>

      <Sheet visible={!!editingField} onClose={() => setEditingField(null)} title={`${t.edit} ${editable[editingField] || ''}`.trim()}>
        <TextField
          label={editable[editingField] || ''}
          value={editValue}
          onChangeText={setEditValue}
          autoFocus
          keyboardType={editingField === 'phone' ? 'phone-pad' : 'default'}
          placeholder={t.enterValue}
          onSubmitEditing={saveEdit}
        />
        <Button title={t.save} onPress={saveEdit} loading={saving} />
      </Sheet>
    </Screen>
  );
}
