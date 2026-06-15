import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BellRing, Loader2, BellOff } from "lucide-react";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export function PushNotificationsCard() {
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushSubscription();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" /> Notificações Push (PWA)
        </CardTitle>
        <CardDescription>
          Receba alertas neste dispositivo mesmo com o app fechado. Funciona no app instalado (PWA) no celular ou desktop.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!supported ? (
          <p className="text-sm text-muted-foreground">
            Este navegador/contexto não suporta notificações push. Abra o PsicoOne instalado como app no seu celular para ativar.
          </p>
        ) : subscribed ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <span className="text-sm">Notificações push ativas neste dispositivo</span>
            <Button variant="outline" size="sm" onClick={unsubscribe} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
              Desativar
            </Button>
          </div>
        ) : (
          <Button onClick={subscribe} disabled={loading} className="gap-2 w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
            Ativar notificações neste dispositivo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
