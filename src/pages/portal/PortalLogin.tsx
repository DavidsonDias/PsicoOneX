import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2, Mail, KeyRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

export default function PortalLogin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: fd.get("email") as string,
        password: fd.get("password") as string,
      });
      if (error) throw error;
      toast.success("Bem-vindo(a) de volta!");
      navigate("/portal/dashboard");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: fd.get("email") as string,
        options: { emailRedirectTo: `${window.location.origin}/portal/dashboard` },
      });
      if (error) throw error;
      toast.success("Link mágico enviado!", { description: "Verifique seu e-mail." });
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível enviar o link");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    const email = (document.getElementById("pwd-email") as HTMLInputElement)?.value;
    if (!email) return toast.error("Digite seu e-mail primeiro");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("E-mail de recuperação enviado!");
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Helmet>
        <title>Portal do Paciente — PsicoOne</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
            <Brain className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-primary">Portal do Paciente</h1>
          <p className="text-muted-foreground text-center text-sm">
            Acesse suas sessões, mensagens e pagamentos
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>
              Use a senha cadastrada ou receba um link mágico no seu e-mail
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleAuthButton redirectPath="/portal/dashboard" disabled={loading} />

            <Tabs defaultValue="password">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password" className="gap-2">
                  <KeyRound className="h-3.5 w-3.5" /> Senha
                </TabsTrigger>
                <TabsTrigger value="magic" className="gap-2">
                  <Mail className="h-3.5 w-3.5" /> Link mágico
                </TabsTrigger>
              </TabsList>


              <TabsContent value="password">
                <form onSubmit={handlePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pwd-email">E-mail</Label>
                    <Input id="pwd-email" name="email" type="email" required disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pwd-pass">Senha</Label>
                    <Input id="pwd-pass" name="password" type="password" required disabled={loading} />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                  <Button type="button" variant="link" className="w-full text-xs" onClick={handleForgot}>
                    Esqueci minha senha
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="magic">
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">E-mail</Label>
                    <Input id="magic-email" name="email" type="email" required disabled={loading} />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Receber link mágico
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Vamos enviar um link único para você entrar sem senha.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Não tem acesso ainda? Peça um convite ao seu profissional.
        </p>
      </div>
    </div>
  );
}
