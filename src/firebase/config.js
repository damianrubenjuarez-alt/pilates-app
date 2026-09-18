import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDwRppbhveGZTiM0gKEpmZaMlDIRTZfETU",
  authDomain: "pilates-studio-1b64a.firebaseapp.com",
  projectId: "pilates-studio-1b64a",
  storageBucket: "pilates-studio-1b64a.firebasestorage.app",
  messagingSenderId: "628395780199",
  appId: "1:628395780199:web:d421a46f26659924ce4cc2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();