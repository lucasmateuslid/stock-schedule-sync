import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { enableIndexedDbPersistence } from "firebase/firestore";

console.log("ENV DEBUG:", {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  domain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  project: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});


// Config via .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Auth + Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Habilita persistência offline (IndexedDB) para Firestore
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    // Erros comuns: failed-precondition (múltiplas abas) ou unimplemented (browser não suportado)
    if (err.code === "failed-precondition") {
      console.warn("Firestore persistence: falhou por múltiplas abas abertas.");
    } else if (err.code === "unimplemented") {
      console.warn("Firestore persistence não suportada neste navegador.");
    } else {
      console.warn("Erro ao habilitar persistência do Firestore:", err);
    }
  });
}

// Analytics (opcional) – sem await no topo e sem travar Firestore
export let analytics: any = null;

if (typeof window !== "undefined" && firebaseConfig.measurementId) {
  import("firebase/analytics").then(({ getAnalytics, isSupported }) => {
    isSupported().then((ok) => {
      if (ok) analytics = getAnalytics(app);
    });
  });
}
