import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "invalid">("checking");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (hash.has("error") || hash.has("error_code") || query.has("error") || query.has("error_code")) {
      setSessionState("invalid");
      return;
    }
    // The SDK can consume the recovery hash before this page mounts.
    void supabase.auth.getUser().then(({ data, error }) => {
      if (active) setSessionState(!error && data.user ? "ready" : "invalid");
    }).catch(() => {
      if (active) setSessionState("invalid");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (active && event === "SIGNED_OUT") setSessionState("invalid");
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => navigate("/auth", { replace: true }), 2000);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sessionState !== "ready" || loading) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) {
        toast.error("Senha atualizada, mas não foi possível encerrar a sessão. Saia da conta antes de entrar novamente.");
        return;
      }
      setSuccess(true);
      toast.success("Senha atualizada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar senha");
    } finally {
      setLoading(false);
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
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader>
            <CardTitle>{success ? "Senha Atualizada" : "Redefinir Senha"}</CardTitle>
            <CardDescription>
              {success ? "Sua senha foi atualizada. Redirecionando..." : sessionState === "ready" ? "Digite sua nova senha abaixo" : sessionState === "checking" ? "Verificando seu acesso..." : "Link inválido ou expirado. Solicite um novo link de recuperação."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-sm text-muted-foreground">Redirecionando para o login...</p>
              </div>
            ) : sessionState === "checking" ? (
              <div role="status" className="flex justify-center py-6"><Loader2 aria-label="Verificando acesso" className="h-6 w-6 animate-spin" /></div>
            ) : sessionState === "invalid" ? (
              <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>Voltar para o login</Button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <Input id="password" name="password" type="password" placeholder="••••••••" minLength={6} required disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar Senha</Label>
                  <Input id="confirm" name="confirm" type="password" placeholder="••••••••" minLength={6} required disabled={loading} />
                </div>
                <Button type="submit" className="w-full" variant="hero" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Atualizar Senha
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
