import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../lib/ThemeContext';
import { useAuth } from '../../../lib/useAuth';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { adminCreateAd, adminUpdateAd, adminDeleteAd, adminUploadAdImage } from '../../../lib/functions';
import * as ImagePicker from 'expo-image-picker';

export default function AdminAds() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [ads, setAds] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
  if (!profile || String(profile.role || '').toLowerCase() !== 'admin') return;
    const q = query(collection(db, 'ads'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => { console.warn('ads onSnapshot error', err); });
    return () => unsub();
  }, [profile?.role]);

  if (!profile || String(profile.role || '').toLowerCase() !== 'admin') return null;

  const handleCreate = async () => {
    if (!title || !message) return Alert.alert('Title and message required');
    try {
      let image_url = null;
      if (imageUri) {
        setUploading(true);
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const reader = new FileReader();
          const base64 = await new Promise((resolve, reject) => {
            reader.onerror = reject;
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
          });
          const result = await adminUploadAdImage(base64, blob.type || 'image/jpeg');
          image_url = result?.url || null;
        } catch (err) {
          Alert.alert('Image upload failed', err.message || String(err));
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }
      await adminCreateAd({ title, message, image_url });
      setTitle('');
      setMessage('');
      setImageUri(null);
      Alert.alert('Ad created successfully');
    } catch (err) {
      Alert.alert('Error', err.message || String(err));
    }
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Permission to access photos is required');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: false });
      // Newer versions return result.assets array; older versions return result.uri and result.cancelled
      if (result && !result.cancelled) {
        // expo-image-picker new API
        if (Array.isArray(result.assets) && result.assets.length > 0 && result.assets[0].uri) {
          setImageUri(result.assets[0].uri);
        } else if (result.uri) {
          setImageUri(result.uri);
        }
      }
    } catch (err) { console.warn('pickImage error', err); Alert.alert('Error', 'Could not pick image'); }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.row, { borderColor: colors.border }]}> 
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.text }]}>{item.title}</Text>
        <Text style={{ color: colors.textSecondary }}>{item.message}</Text>
        {item.image_url ? <Image source={{ uri: item.image_url }} style={{ width: 120, height: 72, marginTop: 8 }} /> : null}
      </View>
      <TouchableOpacity onPress={() => {
        Alert.alert('Delete Ad', 'Are you sure you want to delete this ad?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await adminDeleteAd(item.id);
              Alert.alert('Deleted');
            } catch (err) {
              Alert.alert('Error', err.message || String(err));
            }
          }}
        ]);
      }} style={styles.action}>
        <Text style={{ color: colors.accent }}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background, padding: 24 }]}> 
      <View style={{ marginBottom: 12 }}>
        <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={{ backgroundColor: colors.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, color: colors.text }} />
        <TextInput placeholder="Message" value={message} onChangeText={setMessage} style={{ backgroundColor: colors.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, color: colors.text, marginTop: 8 }} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <TouchableOpacity onPress={pickImage} style={{ backgroundColor: colors.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.text }}>Pick Image</Text>
          </TouchableOpacity>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: 72, height: 48, borderRadius: 6 }} />
          ) : null}
          {uploading ? <ActivityIndicator style={{ marginLeft: 8 }} color={colors.accent} /> : null}
        </View>
        <TouchableOpacity onPress={handleCreate} style={{ marginTop: 12, backgroundColor: colors.accent, padding: 12, borderRadius: 8 }}><Text style={{ color: colors.accentText }}>Create Ad</Text></TouchableOpacity>
      </View>
      <FlatList data={ads} keyExtractor={(i) => i.id} renderItem={renderItem} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} />
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 10 }, name: { fontSize: 16, fontWeight: '600' }, action: { padding: 8 } });
