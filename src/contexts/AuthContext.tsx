import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  email: string;
  role: "admin" | "consultor";
  nome: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    nome: string,
    username: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Carrega sessão inicial e escuta mudanças de autenticação
   */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) fetchProfile(newSession.user.id);
      else setProfile(null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Busca profile no banco
   */
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login
   */
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const session = (await supabase.auth.getSession()).data.session;
      if (session?.user) fetchProfile(session.user.id);

      navigate("/dashboard");
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  /**
   * Registro
   */
  const signUp = async (
    email: string,
    password: string,
    nome: string,
    username: string
  ) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome, username },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      // Carrega o usuário criado
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) fetchProfile(user.id);

      /**
       * Se o username for de admin, chama Edge Function
       */
      if (username === "lucasmateusli") {
        try {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_FUNCTION_URL}/make-admin`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username }),
            }
          );

          // Recarrega o perfil com a role atualizada
          if (user) fetchProfile(user.id);
        } catch (err) {
          console.error("Erro ao chamar função admin:", err);
        }
      }

      navigate("/dashboard");
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  /**
   * Logout
   */
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    navigate("/auth");
  };

  /**
   * Verifica se o usuário tem papel de admin
   */
  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para acessar autenticação
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth must be used within AuthProvider");
  return context;
}
