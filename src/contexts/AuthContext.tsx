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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    nome: string,
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
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
   * OBSERVA AUTOMATICAMENTE LOGIN / LOGOUT
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
   * BUSCA O PERFIL DO FIRESTORE (COM FALLBACK REAL PARA CACHE)
   * --------------------------------------------------------------------------*/
  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid);

      let snap;

      try {
        // tenta servidor normalmente
        snap = await getDoc(docRef);
      } catch (e) {
        console.warn("Servidor offline, tentando cache…");
        try {
          // fallback real
          snap = await getDocFromCache(docRef);
        } catch {
          console.error("Nem servidor nem cache funcionaram.");
          return;
        }
      }

      if (!snap.exists()) return;

      const data = snap.data();

      setProfile({
        id: data.id,
        email: data.email,
        username: data.username,
        nome: data.nome,
        role: data.role,
        created_at: data.created_at?.toDate?.() || new Date(),
      });
    } catch (err) {
      console.error("Erro ao buscar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------------------------
   * LOGIN
   * --------------------------------------------------------------------------*/
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

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
   * CADASTRO (admin tem delay de 1500ms para garantir gravação)
   * --------------------------------------------------------------------------*/
  const signUp = async (
    nome: string,
    username: string,
    email: string,
    password: string
  ) => {
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const role: "admin" | "consultor" = isAdmin ? "admin" : "consultor";

      if (isAdmin) {
        await new Promise((resolve) => setTimeout(resolve, 1500)); // delay admin
      }

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
    } catch (err) {
      console.error("Signup error:", err);
      throw new Error("Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------------------------
   * LOGOUT
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
