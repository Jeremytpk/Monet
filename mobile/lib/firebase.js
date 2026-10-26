import { initializeApp } from 'firebase/app';
// On React Native, Metro resolves firebase/auth to its RN build, which exports
// getReactNativePersistence (the web typings don't list it).
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const config = {
  apiKey: "AIzaSyAtR_mm9W6pHFP6hBmk6saAY9nuMWcZiyk",
  authDomain: "monet-e5200.firebaseapp.com",
  projectId: "monet-e5200",
  storageBucket: "monet-e5200.firebasestorage.app",
  messagingSenderId: "90846306347",
  appId: "1:90846306347:web:49294adae414dba6584a6e",
  measurementId: "G-Y0NCQHM04D"
};

const app = initializeApp(config);
// Keep users signed in across app restarts.
export const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
