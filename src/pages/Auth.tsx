import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();

  // Se já estiver logado → redireciona automaticamente
  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  // -----------------------------
  // 🔐 LOGIN
  // -----------------------------
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error("Preencha email e senha.");
      }

      await signIn(email.trim(), password);
      // signIn já navega para /dashboard
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
      if (!nome.trim() || !email.trim() || !password.trim()) {
        throw new Error("Preencha todos os campos.");
      }

      await signUp(nome.trim(), email.trim(), password);
      toast({
        title: "Conta criada com sucesso!",
        description: "Você já pode acessar o sistema.",
      });
      // signUp já navega para /dashboard
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button disabled={loading} type="submit" className="w-full">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await signInWithGoogle();
                      } catch (err: any) {
                        toast({
                          variant: "destructive",
                          title: "Erro ao entrar com Google",
                          description: err?.message || "Erro inesperado.",
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {loading ? "Entrando..." : "Entrar com Google"}
                  </Button>
                </div>

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

                {/* username removido — cadastro agora usa apenas nome, email e senha */}

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
