import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
