import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD4FcnpGBZ5UNGv0QyJCelOrE4stGonYdY",
  authDomain: "eqpstorage.firebaseapp.com",
  projectId: "eqpstorage",
  storageBucket: "eqpstorage.firebasestorage.app",
  messagingSenderId: "767875128346",
  appId: "1:767875128346:web:23c4d029e3236f1a44c5a3",
  measurementId: "G-F4JPZHVDED",
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços que você precisa
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
