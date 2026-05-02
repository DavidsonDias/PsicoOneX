import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

type State = "loading" | "valid" | "invalid" | "ready" | "creating" | "done";

export default function PortalAcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<State>("loading");
  const [invite, setInvite] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("patient_invites")
        .select("id, email, expires_at, accepted_at, is_revoked, patient_id")
        .eq("token", token)
        .maybeSingle();
      if (error || !data || data.is_revoked || data.accepted_at || new Date(data.expires_at) < new Date()) {
        setState("invalid");
        return;
      }
      setInvite(data);
      setState("valid");
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("creating");
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;

    if (password.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres");
      setState("valid");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      setState("valid");
      return;
    }

    try {
      // 1) Create or sign-in user with invite email
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/portal/dashboard` },
      });

      let userId: string | undefined = signUpData?.user?.id;

      // If account already exists, try to sign in
      if (signUpErr || !userId) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: invite.email,
          password,
        });
        if (signInErr || !signInData.user) {
          throw new Error(
            "Não foi possível criar/acessar a conta. Se você já tem cadastro, use o login normal."
          );
        }
        userId = signInData.user.id;
      }

      // 2) Link user to patient via RPC
      const { error: linkErr } = await supabase.rpc("accept_patient_invite", {
        _token: token!,
        _user_id: userId!,
      });
      if (linkErr) throw linkErr;

      setState("done");
      toast.success("Acesso ativado com sucesso!");
      setTimeout(() => navigate("/portal/dashboard"), 1500);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao ativar acesso");
      setState("valid");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Helmet>
        <title>Ativar acesso — Portal do Paciente</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 space-y-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
            <Brain className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gradient-primary">Portal do Paciente</h1>
        </div>

        <Card>
          {state === "loading" && (
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Validando convite...</p>
            </CardContent>
          )}

          {state === "invalid" && (
            <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <h2 className="font-semibold">Convite inválido ou expirado</h2>
              <p className="text-sm text-muted-foreground">
                Peça um novo convite ao seu profissional.
              </p>
              <Button variant="outline" onClick={() => navigate("/portal/login")}>
                Ir para o login
              </Button>
            </CardContent>
          )}

          {(state === "valid" || state === "creating") && (
            <>
              <CardHeader>
                <CardTitle>Crie sua senha</CardTitle>
                <CardDescription>
                  Você está ativando o acesso para <strong>{invite?.email}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova senha</Label>
                    <Input id="password" name="password" type="password" minLength={6} required disabled={state === "creating"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirme a senha</Label>
                    <Input id="confirm" name="confirm" type="password" minLength={6} required disabled={state === "creating"} />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={state === "creating"}>
                    {state === "creating" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ativar meu acesso
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {state === "done" && (
            <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <h2 className="font-semibold">Tudo pronto!</h2>
              <p className="text-sm text-muted-foreground">Redirecionando...</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
