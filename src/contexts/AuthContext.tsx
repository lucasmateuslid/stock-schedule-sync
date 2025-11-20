import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { auth, db } from "../lib/firebase";
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";

import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

interface Profile {
  id: string;
  email: string;
  username: string;
  nome: string;
  role: "admin" | "consultor";
  created_at: Date;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (login: string, password: string) => Promise<void>;
  signUp: (nome: string, username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          id: data.id,
          email: data.email,
          username: data.username,
          nome: data.nome,
          role: data.role,
          created_at: data.created_at.toDate ? data.created_at.toDate() : data.created_at,
        });
      }
    } catch (err) {
      console.error("Erro ao buscar profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (login: string, password: string) => {
    setLoading(true);
    try {
      let email = login;

      if (!login.includes("@")) {
        // login é username → busca email
        const q = query(collection(db, "users"), where("username", "==", login));
        const result = await getDocs(q);

        if (result.empty) throw new Error("Usuário não encontrado.");
        email = result.docs[0].data().email;
      }

      const credential = await signInWithEmailAndPassword(auth, email, password);
      await fetchProfile(credential.user.uid);

      navigate("/dashboard");
    } catch (err: any) {
      throw new Error(err?.message || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (nome: string, username: string, email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const role: "admin" | "consultor" = username === "lucasmateusli" ? "admin" : "consultor";

      await setDoc(doc(db, "users", uid), {
        id: uid,
        email,
        username,
        nome,
        role,
        created_at: new Date(),
      });

      await fetchProfile(uid);
      navigate("/dashboard");
    } catch (err: any) {
      throw new Error(err?.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
      navigate("/auth");
    } catch (err) {
      console.error("Erro ao sair:", err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
