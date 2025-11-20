import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Firebase
import { auth, db } from "/src/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
} from "firebase/firestore";

// UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Package } from "lucide-react";

export default function Auth() {
  // Form states
  const [login, setLogin] = useState(""); // Login pode ser username ou email
  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  // Se já estiver logado → redireciona automaticamente
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate("/dashboard");
    });
    return () => unsub();
  }, [navigate]);

  // -----------------------------
  // 🔐 LOGIN
  // -----------------------------
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!login.trim() || !password.trim()) {
        throw new Error("Preencha login e senha.");
      }

      let resolvedEmail = login.trim();

      // Se NÃO tiver @ → login é username
      if (!resolvedEmail.includes("@")) {
        const q = query(
          collection(db, "users"),
          where("username", "==", resolvedEmail)
        );
        const result = await getDocs(q);

        if (result.empty) {
          throw new Error("Usuário não encontrado.");
        }

        resolvedEmail = result.docs[0].data().email;
      }

      // Login efetivo
      await signInWithEmailAndPassword(auth, resolvedEmail, password);

      navigate("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: err.message || "Erro inesperado.",
      });
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // 🆕 CADASTRO
  // -----------------------------
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!nome.trim() || !username.trim() || !email.trim() || !password.trim()) {
        throw new Error("Preencha todos os campos.");
      }

      // Cria usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      // Define papel inicial (admin apenas para usuário autorizado)
      const role = email.toLowerCase() === "lucasmateus.lima@outlook.com"
        ? "admin"
        : "consultor";

      // Cria documento do Firestore
      await setDoc(doc(db, "users", uid), {
        id: uid,
        email,
        username,
        nome,
        role,
        created_at: new Date(),
      });

      toast({
        title: "Conta criada com sucesso!",
        description: "Você já pode acessar o sistema.",
      });

      navigate("/dashboard");

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: err.message || "Erro inesperado.",
      });
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------
  // UI / FORM
  // --------------------------------------------------------------------
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-success/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sistema de Gestão</CardTitle>
          <CardDescription>Equipamentos e Agenda Interna</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">

                <div className="space-y-2">
                  <Label>Usuário ou Email</Label>
                  <Input
                    placeholder="seu.username ou email"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button disabled={loading} type="submit" className="w-full">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>

              </form>
            </TabsContent>

            {/* CADASTRO */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">

                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    placeholder="Seu Nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nome de Usuário</Label>
                  <Input
                    placeholder="seu.username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                </div>

                <Button disabled={loading} type="submit" className="w-full">
                  {loading ? "Criando conta..." : "Criar Conta"}
                </Button>

              </form>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
