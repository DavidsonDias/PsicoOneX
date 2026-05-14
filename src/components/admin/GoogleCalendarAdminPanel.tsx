import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, RefreshCw, CheckCircle2, XCircle, Mail, Users, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TokenRow {
  id: string;
  user_id: string;
  google_email: string | null;
  sync_enabled: boolean | null;
  auto_create: boolean | null;
  auto_update: boolean | null;
  sync_new_only: boolean | null;
  token_expires_at: string;
  updated_at: string;
}

export default function GoogleCalendarAdminPanel() {
  const [rows, setRows] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("google_calendar_tokens")
      .select("id, user_id, google_email, sync_enabled, auto_create, auto_update, sync_new_only, token_expires_at, updated_at")
      .order("updated_at", { ascending: false });
    setRows((data as TokenRow[]) || []);

    if (data?.length) {
      const ids = Array.from(new Set(data.map((d: any) => d.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.full_name; });
      setProfilesMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const total = rows.length;
  const enabled = rows.filter(r => r.sync_enabled !== false).length;
  const expired = rows.filter(r => new Date(r.token_expires_at).getTime() < Date.now()).length;
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "configurado via secrets";

  if (loading) return <div className="space-y-3"><Skeleton className="h-32 w-full bg-[hsl(222,47%,18%)]" /><Skeleton className="h-64 w-full bg-[hsl(222,47%,18%)]" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="relative overflow-hidden border-[hsl(222,47%,18%)] bg-gradient-to-br from-[hsl(217,91%,12%)] via-[hsl(222,47%,12%)] to-[hsl(222,47%,12%)] text-[hsl(0,0%,95%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(217,91%,55%/0.18),transparent_60%)] pointer-events-none" />
        <CardContent className="relative p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Calendar className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Google Calendar</h2>
              <p className="text-sm text-[hsl(220,9%,60%)]">OAuth 2.0 · Sincronização bidirecional · {total} usuários conectados</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
            {[
              { label: "Conectados", value: total, color: "text-blue-400", icon: Users },
              { label: "Sync ativo", value: enabled, color: "text-emerald-400", icon: CheckCircle2 },
              { label: "Tokens expirados", value: expired, color: "text-red-400", icon: XCircle },
              { label: "Auto-refresh", value: "ON", color: "text-purple-400", icon: Activity },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-lg bg-[hsl(222,47%,16%)]/60 border border-[hsl(222,47%,22%)] backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-[hsl(220,9%,55%)]">{s.label}</p>
                  <s.icon className="h-3 w-3 text-[hsl(220,9%,45%)]" />
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Credenciais OAuth (Google Cloud Console)</CardTitle>
            <CardDescription className="text-[hsl(220,9%,55%)]">Configuradas via Secrets · não editáveis em tela por segurança</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-[hsl(222,47%,14%)] border border-[hsl(222,47%,20%)]">
            <p className="text-[10px] uppercase tracking-wider text-[hsl(220,9%,55%)]">GOOGLE_CLIENT_ID</p>
            <p className="font-mono text-xs mt-1 truncate">●●●●●●●●●●●●●● (Secret)</p>
          </div>
          <div className="p-3 rounded-lg bg-[hsl(222,47%,14%)] border border-[hsl(222,47%,20%)]">
            <p className="text-[10px] uppercase tracking-wider text-[hsl(220,9%,55%)]">GOOGLE_CLIENT_SECRET</p>
            <p className="font-mono text-xs mt-1 truncate">●●●●●●●●●●●●●● (Secret)</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Usuários conectados</CardTitle>
            <CardDescription className="text-[hsl(220,9%,55%)]">Status individual de sincronização e expiração de token</CardDescription>
          </div>
          <Button onClick={load} variant="outline" className="border-[hsl(222,47%,22%)] bg-transparent text-white hover:bg-[hsl(222,47%,16%)]"><RefreshCw className="h-4 w-4 mr-2" />Atualizar</Button>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-[hsl(220,9%,55%)] text-center py-10">Nenhum usuário conectou o Google Calendar ainda.</p>
          ) : (
            <ScrollArea className="h-[420px] pr-3">
              <div className="space-y-2">
                {rows.map((r) => {
                  const isExpired = new Date(r.token_expires_at).getTime() < Date.now();
                  return (
                    <div key={r.id} className="p-3 rounded-lg bg-[hsl(222,47%,14%)] border border-[hsl(222,47%,20%)] flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{profilesMap[r.user_id] || r.user_id.slice(0, 8)}</p>
                        <p className="text-xs text-[hsl(220,9%,55%)] flex items-center gap-1"><Mail className="h-3 w-3" />{r.google_email || "—"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={r.sync_enabled !== false ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-500/10 text-slate-400 border-slate-500/30"}>
                          {r.sync_enabled !== false ? "Sync ON" : "Sync OFF"}
                        </Badge>
                        {r.auto_create && <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">Auto-criar</Badge>}
                        {r.auto_update && <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">Auto-atualizar</Badge>}
                        <Badge variant="outline" className={isExpired ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}>
                          {isExpired ? "Token expirado" : `Token OK · ${format(new Date(r.token_expires_at), "dd/MM HH:mm", { locale: ptBR })}`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
