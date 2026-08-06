import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Loader2, Mail, KeyRound, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";


const LAST_ID_KEY = "psicoone:last_identifier";
const REMEMBER_KEY = "psicoone:remember_me";

const getRedirectPath = async (userId: string): Promise<string> => {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = data?.map((r) => r.role) || [];
  return roles.includes("super_admin") ? "/super-admin" : "/dashboard";
};

async function resolveEmail(identifier: string): Promise<string> {
  const id = identifier.trim();
  if (id.includes("@")) return id;
  const { data, error } = await supabase.rpc("get_email_by_username", { _username: id });
  if (error) throw error;
  if (!data) throw new Error("Usuário não encontrado");
  return data as string;
}

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [lastIdentifier, setLastIdentifier] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setLastIdentifier(localStorage.getItem(LAST_ID_KEY) || "");
    setRemember(localStorage.getItem(REMEMBER_KEY) !== "false");
    // If user already has a session (e.g. PWA reopened), skip the form.
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const path = await getRedirectPath(session.user.id);
        navigate(path, { replace: true });
      }
    })();
  }, [navigate]);


  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro.", { duration: 6000 });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const identifier = (formData.get("identifier") as string).trim();
    const password = formData.get("password") as string;

    try {
      const email = await resolveEmail(identifier);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      localStorage.setItem(REMEMBER_KEY, String(remember));
      localStorage.setItem(LAST_ID_KEY, identifier);

      toast.success("Login realizado com sucesso!");
      const path = data.user ? await getRedirectPath(data.user.id) : "/dashboard";
      navigate(path);
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const identifier = (fd.get("magic-identifier") as string).trim();
    try {
      const email = await resolveEmail(identifier);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      localStorage.setItem(LAST_ID_KEY, identifier);
      toast.success("Link mágico enviado!", { description: "Verifique seu e-mail para entrar." });
    } catch (error: any) {
      toast.error(error.message || "Não foi possível enviar o link");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const idValue = (document.getElementById("signin-identifier") as HTMLInputElement)?.value;
    if (!idValue) {
      toast.error("Digite seu e-mail ou usuário no campo acima primeiro");
      return;
    }
    try {
      const email = await resolveEmail(idValue);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.", { duration: 6000 });
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar e-mail de recuperação");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
            <Brain className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-primary">PsicoOne</h1>
          <p className="text-muted-foreground text-center">Gestão Inteligente, Cuidado Humano</p>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader>
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>Entre com e-mail ou usuário, ou receba um link mágico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleAuthButton
              label="Entrar com Google"
              roleAwareRedirect
              disabled={loading}
            />


            <div className="relative">
              <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin" className="gap-1.5 text-xs"><KeyRound className="h-3.5 w-3.5" />Entrar</TabsTrigger>
                <TabsTrigger value="magic" className="gap-1.5 text-xs"><Sparkles className="h-3.5 w-3.5" />Link mágico</TabsTrigger>
                <TabsTrigger value="signup" className="gap-1.5 text-xs"><Mail className="h-3.5 w-3.5" />Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-identifier">E-mail ou usuário</Label>
                    <Input
                      id="signin-identifier"
                      name="identifier"
                      type="text"
                      placeholder="seu@email.com ou usuario"
                      defaultValue={lastIdentifier}
                      autoComplete="username"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Senha</Label>
                    <Input id="signin-password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required disabled={loading} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                      Manter conectado
                    </label>
                    <Button type="button" variant="link" className="text-xs px-0 h-auto" onClick={handleForgotPassword}>
                      Esqueceu a senha?
                    </Button>
                  </div>
                  <Button type="submit" className="w-full" variant="hero" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="magic">
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="magic-identifier">E-mail ou usuário</Label>
                    <Input
                      id="magic-identifier"
                      name="magic-identifier"
                      type="text"
                      placeholder="seu@email.com ou usuario"
                      defaultValue={lastIdentifier}
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" variant="hero" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar link mágico
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Enviamos um link único para você entrar sem senha.
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input id="signup-name" name="fullName" type="text" placeholder="Seu nome completo" required disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input id="signup-email" name="email" type="email" placeholder="seu@email.com" required disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input id="signup-password" name="password" type="password" placeholder="••••••••" minLength={6} required disabled={loading} />
                  </div>
                  <Button type="submit" className="w-full" variant="hero" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Conta
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Você receberá um e-mail de confirmação antes de acessar o sistema.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-6 text-center space-y-3">
          <Button variant="link" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
            Voltar para a página inicial
          </Button>
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()}{" "}
            <a href="https://SevenDevX.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              SevenDevX
            </a>{" "}
            — Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
