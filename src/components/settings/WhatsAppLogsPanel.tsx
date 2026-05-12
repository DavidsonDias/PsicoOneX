import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  sending: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  sent: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  read: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
  failed: "bg-red-500/15 text-red-700 dark:text-red-400",
  received: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
};

export default function WhatsAppLogsPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_logs")
      .select("id, phone, template, message_type, body_preview, status, error, sent_at, created_at, attempts")
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-600" /> Logs WhatsApp
          </h3>
          <p className="text-xs text-muted-foreground">Últimas 100 mensagens (entrega, status, erros)</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="gap-1">
          <RefreshCw className="h-3 w-3" /> Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Nenhum log ainda</p>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto">
          {logs.map((l) => (
            <div key={l.id} className="border rounded-md p-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono">{l.phone}</span>
                <Badge className={`${STATUS[l.status] || ""} border-0 text-[10px]`}>{l.status}</Badge>
              </div>
              <div className="text-muted-foreground">
                {l.template ? `📋 ${l.template}` : `💬 ${l.message_type}`} · {format(new Date(l.created_at), "dd/MM HH:mm", { locale: ptBR })}
                {l.attempts > 1 && ` · ${l.attempts} tentativas`}
              </div>
              {l.body_preview && <div className="truncate">{l.body_preview}</div>}
              {l.error && <div className="text-destructive">⚠ {l.error}</div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
