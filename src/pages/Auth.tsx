import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Se já estiver logado → dashboard
  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  // Buscar email via Edge Function usando username
  const fetchEmailFromUsername = useCallback(
    async (username: string): Promise<{ email: string } | null> => {
      try {
        const response = await fetch(
          import.meta.env.VITE_SUPABASE_SWIFT_PROCESSOR_URL,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
          }
        );

        if (!response.ok) return null;

        return await response.json();
      } catch (err) {
        console.error("Erro ao buscar e-mail:", err);
        return null;
      }
    },
    []
  );

  // LOGIN
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!username.trim()) {
        throw new Error("Informe seu nome de usuário.");
      }

      // Buscar email correspondente ao username
      const result = await fetchEmailFromUsername(username);

      if (!result?.email) {
        throw new Error("Usuário não encontrado.");
      }

      setEmail(result.email);

      const { error } = await signIn(result.email, password);

      if (error) throw new Error(error.message);

      navigate("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: err?.message || "Erro interno.",
      });
    } finally {
      setLoading(false);
    }
  };

  // CADASTRO
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!nome.trim() || !username.trim()) {
        throw new Error("Preencha nome completo e nome de usuário.");
      }

      const { error } = await signUp(email, password, nome, username);

      if (error) throw new Error(error.message);

      toast({
        title: "Conta criada com sucesso!",
        description: "Você já pode acessar o sistema.",
      });

      // Chama função de upgrade admin se necessário
      fetch(import.meta.env.VITE_SUPABASE_HYPER_HANDLER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      }).catch(console.error);

      navigate("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: err?.message || "Erro interno.",
      });
    } finally {
      setLoading(false);
    }
  };

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
                  <Label>Nome de Usuário</Label>
                  <Input
                    type="text"
                    placeholder="seu.username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                    type="text"
                    placeholder="Seu Nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nome de Usuário</Label>
                  <Input
                    type="text"
                    placeholder="seu.username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 6 caracteres
                  </p>
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
