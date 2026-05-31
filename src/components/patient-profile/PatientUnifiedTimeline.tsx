import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, DollarSign, Paperclip, Activity, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

interface Props {
  patientId: string;
  patientName: string;
}

type EventType = "record" | "appointment" | "payment" | "attachment";
interface TimelineEvent {
  id: string;
  type: EventType;
  date: Date;
  title: string;
  description?: string;
  badge?: string;
  amount?: number;
}

const typeConfig: Record<EventType, { icon: any; color: string; bg: string; label: string }> = {
  record: { icon: FileText, color: "text-primary", bg: "bg-primary/10", label: "Prontuário" },
  appointment: { icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10", label: "Sessão" },
  payment: { icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10", label: "Financeiro" },
  attachment: { icon: Paperclip, color: "text-purple-500", bg: "bg-purple-500/10", label: "Anexo" },
};

export function PatientUnifiedTimeline({ patientId, patientName }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | EventType>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAll();
  }, [patientId]);

  const loadAll = async () => {
    setLoading(true);
    const [recordsRes, apptsRes, txRes] = await Promise.all([
      supabase
        .from("medical_records")
        .select("id, session_date, session_number, observations, complaints")
        .eq("patient_id", patientId)
        .is("deleted_at", null)
        .order("session_date", { ascending: false }),
      supabase
        .from("appointments")
        .select("id, scheduled_at, status, type, notes")
        .eq("patient_id", patientId)
        .is("deleted_at", null)
        .order("scheduled_at", { ascending: false }),
      supabase
        .from("financial_transactions")
        .select("id, amount, status, type, paid_date, due_date, description, created_at")
        .eq("patient_id", patientId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    const all: TimelineEvent[] = [];

    (recordsRes.data || []).forEach((r) => {
      all.push({
        id: `rec-${r.id}`,
        type: "record",
        date: new Date(r.session_date + "T00:00:00"),
        title: `Prontuário — Sessão ${r.session_number ?? "—"}`,
        description: (r.observations || r.complaints || "").replace(/--- Anotações Livres ---/g, "").trim().slice(0, 140),
      });
    });

    (apptsRes.data || []).forEach((a) => {
      all.push({
        id: `apt-${a.id}`,
        type: "appointment",
        date: new Date(a.scheduled_at),
        title: a.type === "online" ? "Sessão Online" : "Sessão Presencial",
        description: a.notes || undefined,
        badge: a.status,
      });
    });

    (txRes.data || []).forEach((t) => {
      const date = t.paid_date || t.due_date || t.created_at;
      all.push({
        id: `tx-${t.id}`,
        type: "payment",
        date: new Date(date),
        title: t.description || (t.type === "income" ? "Receita" : "Despesa"),
        badge: t.status,
        amount: Number(t.amount),
      });
    });

    // attachments
    const recordIds = (recordsRes.data || []).map((r) => r.id);
    if (recordIds.length > 0) {
      const { data: atts } = await supabase
        .from("medical_record_attachments")
        .select("id, file_name, file_type, created_at")
        .in("medical_record_id", recordIds);
      (atts || []).forEach((a) => {
        all.push({
          id: `att-${a.id}`,
          type: "attachment",
          date: new Date(a.created_at),
          title: a.file_name,
          badge: a.file_type,
        });
      });
    }

    all.sort((a, b) => b.date.getTime() - a.date.getTime());
    setEvents(all);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (search) {
        const t = search.toLowerCase();
        if (!e.title.toLowerCase().includes(t) && !e.description?.toLowerCase().includes(t)) return false;
      }
      return true;
    });
  }, [events, filter, search]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Linha do Tempo Clínica — {patientName}
            <Badge variant="secondary" className="ml-auto">{filtered.length} eventos</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar na timeline..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                <SelectItem value="record">Prontuários</SelectItem>
                <SelectItem value="appointment">Sessões</SelectItem>
                <SelectItem value="payment">Financeiro</SelectItem>
                <SelectItem value="attachment">Anexos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum evento encontrado</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
              <div className="space-y-3">
                {filtered.map((e, i) => {
                  const cfg = typeConfig[e.type];
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="relative pl-10"
                    >
                      <div className={`absolute left-1.5 top-3 w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center ring-4 ring-background`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>
                      <div className="p-3 rounded-lg border border-border hover:border-primary/40 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                              {e.badge && <Badge variant="secondary" className="text-[10px]">{e.badge}</Badge>}
                              {typeof e.amount === "number" && (
                                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                  R$ {e.amount.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-sm mt-1 truncate">{e.title}</p>
                            {e.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                            {format(e.date, "dd MMM yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
