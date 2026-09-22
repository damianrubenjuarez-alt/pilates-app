// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

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
export const googleProvider = new GoogleAuthProvider();

// ⚠️ Usamos initializeFirestore con long-polling para evitar
// bloqueos de adblockers y firewalls corporativos.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});

// ⚠️ IMPORTANTE: especificar la región de las Cloud Functions
// Todas nuestras funciones están en southamerica-east1
export const functions = getFunctions(app, 'southamerica-east1');