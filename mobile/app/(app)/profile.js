import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../lib/useAuth';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/LanguageContext';

const AVATAR_SIZE = 128;

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
  const name = profile?.name || user?.email?.split('@')[0] || '?';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  const fields = [
    { key: 'name', label: t.fieldName, value: profile?.name || '—', editable: true },
    { key: 'email', label: t.fieldEmail, value: user?.email || '—', editable: true },
    { key: 'phone', label: t.fieldPhone, value: profile?.phone || '—', editable: true },
    { key: 'currency', label: t.fieldCurrency, value: profile?.currency || 'USD', editable: false },
    { key: 'wallet_id', label: t.fieldWalletId, value: profile?.wallet_id || '—', editable: false },
  ];

  function openEdit(field) {
    const f = fields.find((x) => x.key === field);
    if (f?.editable) {
      setEditValue(f.value === '—' ? '' : f.value);
      setEditingField(field);
    }
  }

  async function saveEdit() {
    if (!user?.uid || !editingField) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      if (editingField === 'email') {
        Alert.alert(t.fieldEmail, t.editEmailMsg);
        setEditingField(null);
        setSaving(false);
        return;
      }
      const payload = { [editingField]: editValue.trim() || null, updated_at: serverTimestamp() };
      await updateDoc(userRef, payload);
      setProfile((p) => (p ? { ...p, [editingField]: editValue.trim() || null } : null));
      setEditingField(null);
    } catch (e) {
      Alert.alert(t.error, e.message || t.errCouldNotUpdate);
    } finally {
      setSaving(false);
    }
  }

  function showPhotoOptions() {
    Alert.alert(
      t.profilePhoto,
      t.profilePhotoMsg,
      [
        { text: t.takePhoto, onPress: handleTakePhoto },
        { text: t.chooseFromGallery, onPress: handleChooseFromGallery },
        ...(photoUrl ? [{ text: t.removePhoto, onPress: handleRemovePhoto, style: 'destructive' }] : []),
        { text: t.cancel, style: 'cancel' },
      ]
    );
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.permissionNeeded, t.cameraPermission);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await uploadAndSetPhoto(result.assets[0].uri);
    }
  }

  async function handleChooseFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.permissionNeeded, t.galleryPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await uploadAndSetPhoto(result.assets[0].uri);
    }
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
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL,
        updated_at: serverTimestamp(),
      });
      setProfile((p) => (p ? { ...p, photoURL } : null));
      Alert.alert(t.success, t.photoUpdated, [{ text: t.ok }]);
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
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: null,
        updated_at: serverTimestamp(),
      });
      setProfile((p) => (p ? { ...p, photoURL: null } : null));
    } catch (e) {
      Alert.alert(t.error, e.message || t.errRemovePhoto);
    } finally {
      setUploadingPhoto(false);
    }
  }

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.avatarRow}>
          <TouchableOpacity
            style={[styles.avatarWrap, { borderColor: colors.border }]}
            onPress={showPhotoOptions}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                <Text style={[styles.avatarInitial, { color: colors.textSecondary }]}>{initial}</Text>
              </View>
            )}
            <View style={[styles.cameraIconWrap, { backgroundColor: colors.accent }]}>
              <Ionicons name="camera" size={22} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {fields.map((f, i) => (
            <View
              key={f.key}
              style={[
                styles.row,
                i < fields.length - 1 && styles.rowBorder,
              ]}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>{f.label}</Text>
                <Text style={styles.rowValue} numberOfLines={1}>{f.value}</Text>
              </View>
              {f.editable && (
                <TouchableOpacity
                  style={styles.editIconWrap}
                  onPress={() => openEdit(f.key)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="pencil" size={20} color={colors.accent} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={!!editingField}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingField(null)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContentWrap}
          >
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t.editField} {fields.find((x) => x.key === editingField)?.label}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={t.enterValue}
                placeholderTextColor={colors.muted}
                autoFocus
                editable={!saving}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setEditingField(null)}>
                  <Text style={[styles.modalButtonCancelText, { color: colors.text }]}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButtonSave, { backgroundColor: colors.accent }]}
                  onPress={saveEdit}
                  disabled={saving}
                >
                  <Text style={[styles.modalButtonSaveText, { color: colors.accentText }]}>
                    {saving ? t.saving : t.save}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
    backButton: { marginRight: 12, padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    scroll: { flex: 1 },
    content: { padding: 24 },
    avatarRow: { alignItems: 'center', marginBottom: 24 },
    avatarWrap: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      borderWidth: 2,
      overflow: 'hidden',
      position: 'relative',
    },
    avatar: { width: '100%', height: '100%' },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: { fontSize: 48, fontWeight: '700' },
    cameraIconWrap: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 18,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    rowLeft: { flex: 1, marginRight: 12 },
    rowLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
    rowValue: { fontSize: 16, color: colors.text, fontWeight: '500' },
    editIconWrap: { padding: 4 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 24,
    },
    modalContentWrap: { width: '100%' },
    modalCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 24,
    },
    modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
    modalInput: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      fontSize: 16,
      marginBottom: 20,
    },
    modalButtons: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
    modalButtonCancel: { paddingVertical: 12, paddingHorizontal: 20 },
    modalButtonCancelText: { fontSize: 16, fontWeight: '500' },
    modalButtonSave: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
    modalButtonSaveText: { fontSize: 16, fontWeight: '600' },
  });
}
