import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, MailX } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Verificando...</p>
            </>
          )}

          {status === "valid" && (
            <>
              <MailX className="h-12 w-12 text-primary mx-auto" />
              <h1 className="text-xl font-semibold">Cancelar inscrição</h1>
              <p className="text-muted-foreground text-sm">
                Você deixará de receber e-mails de notificação do PsicoOne.
              </p>
              <Button onClick={handleUnsubscribe} disabled={processing} className="w-full">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar cancelamento
              </Button>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-semibold">Inscrição cancelada</h1>
              <p className="text-muted-foreground text-sm">
                Você não receberá mais e-mails de notificação.
              </p>
            </>
          )}

          {status === "already" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto" />
              <h1 className="text-xl font-semibold">Já cancelado</h1>
              <p className="text-muted-foreground text-sm">
                Esta inscrição já foi cancelada anteriormente.
              </p>
            </>
          )}

          {status === "invalid" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold">Link inválido</h1>
              <p className="text-muted-foreground text-sm">
                Este link de cancelamento é inválido ou expirou.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold">Erro</h1>
              <p className="text-muted-foreground text-sm">
                Ocorreu um erro. Tente novamente mais tarde.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
