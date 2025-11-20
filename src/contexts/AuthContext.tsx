import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

import { auth, db } from "@/lib/firebase";

import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import {
  doc,
  getDoc,
  getDocFromCache,
  setDoc,
} from "firebase/firestore";

/* ----------------------------------------------------------------------------
 * Tipagem do profile
 * --------------------------------------------------------------------------*/
interface Profile {
  id: string;
  email: string;
  username?: string;
  nome: string;
  role: "admin" | "consultor";
  created_at: Date;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    nome: string,
    email: string,
    password: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const ADMIN_EMAIL = "lucasmateus.lima@outlook.com";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  /* ----------------------------------------------------------------------------
   * Observa login / logout
   * --------------------------------------------------------------------------*/
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  /* ----------------------------------------------------------------------------
   * Busca de perfil — cache-first + server update
   * --------------------------------------------------------------------------*/
  const fetchProfile = async (uid: string) => {
    setLoading(true);

    try {
      const docRef = doc(db, "users", uid);

      // 1 — TENTAR CACHE (instantâneo)
      let cacheSnap = null;
      try {
        cacheSnap = await getDocFromCache(docRef);
      } catch {
        cacheSnap = null;
      }

      if (cacheSnap?.exists()) {
        const data = cacheSnap.data();
        setProfile({
          id: data.id,
          email: data.email,
          username: data.username,
          nome: data.nome,
          role: data.role,
          created_at: data.created_at?.toDate?.() || new Date(),
        });
      }

      // 2 — BUSCAR DO SERVIDOR (não força mais "server: only")
      const serverSnap = await getDoc(docRef);

      if (serverSnap.exists()) {
        const data = serverSnap.data();
        setProfile({
          id: data.id,
          email: data.email,
          username: data.username,
          nome: data.nome,
          role: data.role,
          created_at: data.created_at?.toDate?.() || new Date(),
        });
      } else if (!cacheSnap) {
        setProfile(null);
      }
    } catch (error) {
      console.warn("Erro buscando perfil (cache/server):", error);
      // Se falhou mas tinha cache → mantém perfil do cache
      // Se falhou e não tinha cache → seta null
      if (!profile) setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------------------------
   * Login
   * --------------------------------------------------------------------------*/
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await fetchProfile(credential.user.uid);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      throw new Error("Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------------------------
   * Login com Google
   * --------------------------------------------------------------------------*/
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const user = result.user;
      if (!user) throw new Error("Erro no login com Google");

      const uid = user.uid;
      const userRef = doc(db, "users", uid);

      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        const email = user.email || "";
        const nome = user.displayName || "Usuário";
        const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        await setDoc(
          userRef,
          {
            id: uid,
            email,
            nome,
            role: isAdmin ? "admin" : "consultor",
            created_at: new Date(),
          },
          { merge: true }
        );
      }

      await fetchProfile(uid);
      navigate("/dashboard");
    } catch (err) {
      console.error("Google sign-in error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------------------------
   * Cadastro
   * --------------------------------------------------------------------------*/
  const signUp = async (nome: string, email: string, password: string) => {
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      await setDoc(doc(db, "users", uid), {
        id: uid,
        email,
        nome,
        role: isAdmin ? "admin" : "consultor",
        created_at: new Date(),
      });

      await fetchProfile(uid);
      navigate("/dashboard");
    } catch (err) {
      console.error("Signup error:", err);
      throw new Error("Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------------------------
   * Logout
   * --------------------------------------------------------------------------*/
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
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
