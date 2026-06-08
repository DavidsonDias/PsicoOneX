import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, TrendingUp, AlertTriangle, UserX, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatBR } from "@/lib/datetime";
import { differenceInDays } from "date-fns";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface NextSession {
  id: string;
  scheduled_at: string;
  patient_name: string;
}

export function NextSessionWidget() {
  const [next, setNext] = useState<NextSession | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("appointments")
        .select("id, scheduled_at, patients(full_name)")
        .eq("psychologist_id", session.user.id)
        .gte("scheduled_at", new Date().toISOString())
        .neq("status", "cancelled")
        .is("deleted_at", null)
        .order("scheduled_at", { ascending: true })
        .limit(1);
      const row: any = data?.[0];
      if (row) setNext({ id: row.id, scheduled_at: row.scheduled_at, patient_name: row.patients?.full_name || "—" });
    })();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" /> Próxima sessão
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!next ? (
          <p className="text-sm text-muted-foreground">Nenhuma sessão agendada.</p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{next.patient_name}</p>
              <p className="text-xs text-muted-foreground">{formatBR(next.scheduled_at, "EEEE, dd/MM 'às' HH:mm")}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/agenda")}>
              Abrir <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RevenueForecastWidget() {
  const [forecast, setForecast] = useState({ expected: 0, received: 0 });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const { data } = await supabase
        .from("financial_transactions")
        .select("amount, status, type")
        .eq("psychologist_id", session.user.id)
        .eq("type", "income")
        .gte("due_date", start)
        .lte("due_date", end);
      const expected = (data || []).reduce((s, t: any) => s + Number(t.amount || 0), 0);
      const received = (data || []).filter((t: any) => t.status === "paid").reduce((s, t: any) => s + Number(t.amount || 0), 0);
      setForecast({ expected, received });
    })();
  }, []);

  const pct = forecast.expected > 0 ? Math.round((forecast.received / forecast.expected) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" /> Receita do mês
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">{brl(forecast.received)}</span>
          <span className="text-xs text-muted-foreground">de {brl(forecast.expected)}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{pct}% recebido</p>
      </CardContent>
    </Card>
  );
}

export function OverdueWidget() {
  const [overdue, setOverdue] = useState({ count: 0, total: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("financial_transactions")
        .select("amount")
        .eq("psychologist_id", session.user.id)
        .eq("type", "income")
        .neq("status", "paid")
        .lt("due_date", today);
      const list = data || [];
      setOverdue({ count: list.length, total: list.reduce((s, t: any) => s + Number(t.amount || 0), 0) });
    })();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Inadimplência
        </CardTitle>
      </CardHeader>
      <CardContent>
        {overdue.count === 0 ? (
          <p className="text-sm text-muted-foreground">Nada em atraso. 🎉</p>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{brl(overdue.total)}</p>
              <p className="text-xs text-muted-foreground">{overdue.count} cobrança(s) em atraso</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/financeiro")}>Resolver</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InactivePatientsWidget() {
  const [items, setItems] = useState<Array<{ id: string; name: string; days: number }>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: patients } = await supabase
        .from("patients")
        .select("id, full_name")
        .eq("psychologist_id", session.user.id)
        .is("deleted_at", null);
      if (!patients?.length) return;
      const ids = patients.map((p) => p.id);
      const { data: appts } = await supabase
        .from("appointments")
        .select("patient_id, scheduled_at")
        .in("patient_id", ids)
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: false });
      const lastByPatient = new Map<string, string>();
      for (const a of appts || []) {
        if (!lastByPatient.has((a as any).patient_id)) {
          lastByPatient.set((a as any).patient_id, (a as any).scheduled_at);
        }
      }
      const inactive = patients
        .map((p) => {
          const last = lastByPatient.get(p.id);
          const days = last ? differenceInDays(new Date(), new Date(last)) : 999;
          return { id: p.id, name: p.full_name, days };
        })
        .filter((p) => p.days > 30)
        .sort((a, b) => b.days - a.days)
        .slice(0, 5);
      setItems(inactive);
    })();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserX className="h-4 w-4 text-muted-foreground" /> Pacientes sem sessão (+30d)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todos os pacientes ativos. ✨</p>
        ) : (
          items.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50 cursor-pointer"
              onClick={() => navigate(`/pacientes/${p.id}`)}
            >
              <span className="truncate">{p.name}</span>
              <Badge variant="outline" className="text-xs">{p.days === 999 ? "sem histórico" : `${p.days}d`}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
