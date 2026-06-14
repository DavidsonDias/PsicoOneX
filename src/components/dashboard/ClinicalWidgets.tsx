import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, UserMinus, CalendarDays, FileWarning, ArrowRight, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatBR } from "@/lib/datetime";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Pacientes ativos — conta lifecycle_status = 'ativo' (ou NULL = legacy active). */
export function ActivePatientsWidget() {
  const [count, setCount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("patients")
        .select("id, lifecycle_status")
        .eq("user_id", session.user.id)
        .is("deleted_at", null);
      const rows = data || [];
      setTotal(rows.length);
      setCount(rows.filter((p: any) => !p.lifecycle_status || p.lifecycle_status === "ativo").length);
    })();
  }, []);

  return (
    <Card className="relative overflow-hidden border-primary/20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Pacientes ativos
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate("/pacientes")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold tracking-tight">{count}</p>
          <p className="text-sm text-muted-foreground">de {total} cadastrados</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {total > 0 ? Math.round((count / total) * 100) : 0}% da base em acompanhamento
        </p>
      </CardContent>
    </Card>
  );
}

/** Risco de abandono — pacientes ativos sem sessão concluída há +30 dias. */
export function AbandonmentRiskWidget() {
  const [risky, setRisky] = useState<Array<{ id: string; name: string; lastSeen: Date | null; days: number }>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: patients } = await supabase
        .from("patients")
        .select("id, full_name, lifecycle_status")
        .eq("user_id", session.user.id)
        .is("deleted_at", null);

      const actives = (patients || []).filter(
        (p: any) => !p.lifecycle_status || p.lifecycle_status === "ativo"
      );
      if (actives.length === 0) return;

      const ids = actives.map((p: any) => p.id);
      const { data: appts } = await supabase
        .from("appointments")
        .select("patient_id, scheduled_at, status")
        .in("patient_id", ids)
        .eq("psychologist_id", session.user.id)
        .lte("scheduled_at", new Date().toISOString())
        .is("deleted_at", null)
        .order("scheduled_at", { ascending: false });

      const lastByPatient = new Map<string, Date>();
      for (const a of appts || []) {
        if (a.status === "cancelled") continue;
        if (!lastByPatient.has(a.patient_id)) {
          lastByPatient.set(a.patient_id, new Date(a.scheduled_at));
        }
      }
      const now = new Date();
      const out = actives
        .map((p: any) => {
          const last = lastByPatient.get(p.id) ?? null;
          const days = last ? differenceInDays(now, last) : 999;
          return { id: p.id, name: p.full_name, lastSeen: last, days };
        })
        .filter((p) => p.days > 30)
        .sort((a, b) => b.days - a.days)
        .slice(0, 6);
      setRisky(out);
    })();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserMinus className="h-4 w-4 text-amber-500" /> Risco de abandono
          <Badge variant="secondary" className="ml-1">{risky.length}</Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate("/pacientes")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {risky.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            ✨ Nenhum paciente ativo sem sessão recente.
          </p>
        ) : (
          <ul className="space-y-2">
            {risky.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/pacientes/${p.id}`)}
              >
                <span className="text-sm font-medium truncate">{p.name}</span>
                <Badge variant={p.days > 60 ? "destructive" : "outline"} className="shrink-0">
                  {p.days >= 999 ? "sem sessão" : `${p.days}d`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Próximos pagamentos — receitas pendentes nos próximos 7 dias. */
export function UpcomingPaymentsWidget() {
  const [items, setItems] = useState<Array<{ id: string; due: string; amount: number; patient: string | null }>>([]);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const now = new Date();
      const in7 = new Date(); in7.setDate(in7.getDate() + 7);
      const { data } = await (supabase as any)
        .from("financial_transactions")
        .select("id, amount, due_date, patients(full_name)")
        .eq("user_id", session.user.id)
        .eq("type", "income")
        .eq("status", "pending")
        .gte("due_date", now.toISOString().slice(0, 10))
        .lte("due_date", in7.toISOString().slice(0, 10))
        .is("deleted_at", null)
        .order("due_date", { ascending: true })
        .limit(8);
      const rows = (data as any[]) || [];
      setItems(rows.map((r: any) => ({
        id: r.id, due: r.due_date, amount: Number(r.amount || 0),
        patient: r.patients?.full_name ?? null,
      })));
      setTotal(rows.reduce((s, r) => s + Number(r.amount || 0), 0));
    })();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-500" /> Próximos pagamentos
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate("/financeiro")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-2xl font-bold">{brl(total)}</p>
          <p className="text-xs text-muted-foreground">próximos 7 dias</p>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">Nada agendado.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.slice(0, 5).map((i) => (
              <li key={i.id} className="flex items-center justify-between text-sm">
                <span className="truncate min-w-0 flex-1">{i.patient ?? "—"}</span>
                <span className="text-xs text-muted-foreground mx-2">{formatBR(i.due)}</span>
                <span className="font-medium tabular-nums">{brl(i.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Pendências clínicas — sessões concluídas há +48h sem prontuário associado. */
export function PendingRecordsWidget() {
  const [items, setItems] = useState<Array<{ id: string; when: Date; patient: string; patient_id: string }>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const cutoff = new Date(); cutoff.setHours(cutoff.getHours() - 48);
      const { data } = await supabase
        .from("appointments")
        .select("id, scheduled_at, patient_id, patients(full_name)")
        .eq("psychologist_id", session.user.id)
        .eq("status", "completed")
        .lte("scheduled_at", cutoff.toISOString())
        .is("deleted_at", null)
        .order("scheduled_at", { ascending: false })
        .limit(40);
      const appts = (data as any[]) || [];
      if (appts.length === 0) return;

      const apptIds = appts.map((a) => a.id);
      const { data: recs } = await supabase
        .from("medical_records")
        .select("appointment_id")
        .in("appointment_id", apptIds)
        .is("deleted_at", null);
      const covered = new Set((recs || []).map((r: any) => r.appointment_id));
      const pending = appts
        .filter((a) => !covered.has(a.id))
        .slice(0, 6)
        .map((a) => ({
          id: a.id,
          when: new Date(a.scheduled_at),
          patient: a.patients?.full_name ?? "—",
          patient_id: a.patient_id,
        }));
      setItems(pending);
    })();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-rose-500" /> Pendências clínicas
          <Badge variant="secondary" className="ml-1">{items.length}</Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate("/prontuarios")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            <Sparkles className="h-4 w-4 inline mr-1" /> Todos os prontuários em dia.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/pacientes/${i.patient_id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{i.patient}</p>
                  <p className="text-xs text-muted-foreground">
                    sessão {format(i.when, "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">sem registro</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
