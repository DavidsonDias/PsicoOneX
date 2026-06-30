import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Scale, CheckCircle2, RotateCcw, AlertCircle, Loader2, Search, Sparkles, Plus, Repeat,
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { SmartTransactionDialog } from "./SmartTransactionDialog";

type Tx = {
  id: string;
  patient_id: string | null;
  amount: number;
  due_date: string;
  status: string;
  description: string | null;
  payment_method: string | null;
  billing_plan_id: string | null;
};

type Patient = { id: string; full_name: string };
type Plan = { id: string; patient_id: string; billing_type: string; amount: number };

/**
 * ReconciliationPanel
 * Bank-style fast reconciliation of pending charges:
 *  - List of all pending/overdue income transactions (with plan link badge)
 *  - Bulk "marcar como recebido"
 *  - "Estornar" (revert paid to pending)
 *  - Detects active plans WITHOUT generated charge → suggests "Criar cobrança"
 */
export function ReconciliationPanel({
  patients,
  onChanged,
}: {
  patients: Patient[];
  onChanged?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<Tx[]>([]);
  const [paidRecent, setPaidRecent] = useState<Tx[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "overdue">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lockedPatient, setLockedPatient] = useState<Patient | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: pend } = await supabase
      .from("financial_transactions")
      .select("id, patient_id, amount, due_date, status, description, payment_method, billing_plan_id")
      .eq("type", "income")
      .in("status", ["pending"])
      .is("deleted_at", null)
      .order("due_date", { ascending: true });
    setTx((pend as Tx[]) || []);

    const { data: paid } = await supabase
      .from("financial_transactions")
      .select("id, patient_id, amount, due_date, status, description, payment_method, billing_plan_id")
      .eq("type", "income")
      .eq("status", "paid")
      .is("deleted_at", null)
      .order("paid_date", { ascending: false })
      .limit(10);
    setPaidRecent((paid as Tx[]) || []);

    const { data: pl } = await (supabase as any)
      .from("patient_billing_plans")
      .select("id, patient_id, billing_type, amount")
      .eq("active", true)
      .is("deleted_at", null);
    setPlans((pl as Plan[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const enriched = useMemo(() => {
    const today = startOfDay(new Date());
    return tx.map((t) => {
      const overdue = isBefore(new Date(t.due_date + "T23:59:59"), today);
      const patient = patients.find((p) => p.id === t.patient_id);
      return { ...t, _overdue: overdue, _patient_name: patient?.full_name || "—" };
    });
  }, [tx, patients]);

  const filtered = useMemo(() => {
    return enriched.filter((t) => {
      if (statusFilter === "pending" && t._overdue) return false;
      if (statusFilter === "overdue" && !t._overdue) return false;
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        t._patient_name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    });
  }, [enriched, filter, statusFilter]);

  // Active plans missing an open charge → reconciliation gaps
  const plansMissingCharge = useMemo(() => {
    const withOpen = new Set(tx.filter((t) => t.billing_plan_id).map((t) => t.billing_plan_id));
    return plans.filter((p) => !withOpen.has(p.id));
  }, [plans, tx]);

  const selectedTotal = useMemo(
    () => filtered.filter((t) => selected.has(t.id)).reduce((s, t) => s + Number(t.amount), 0),
    [filtered, selected]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.id)));
  };

  const bulkMarkPaid = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("financial_transactions")
      .update({ status: "paid", paid_date: new Date().toISOString().slice(0, 10) } as any)
      .in("id", ids);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${ids.length} cobrança(s) conciliada(s) como recebidas`);
    setSelected(new Set());
    load();
    onChanged?.();
  };

  const revertPaid = async (id: string) => {
    if (!confirm("Estornar este pagamento? A cobrança volta para pendente.")) return;
    const { error } = await supabase
      .from("financial_transactions")
      .update({ status: "pending", paid_date: null } as any)
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pagamento estornado");
    load();
    onChanged?.();
  };

  const createChargeForPlan = (plan: Plan) => {
    const patient = patients.find((p) => p.id === plan.patient_id) || null;
    setLockedPatient(patient);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="h-4 w-4 text-primary" /> Reconciliação Financeira
              </CardTitle>
              <CardDescription>
                Concilie pagamentos recebidos com as cobranças em aberto e detecte planos ativos sem lançamento.
              </CardDescription>
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {selected.size} selecionada(s) · R$ {selectedTotal.toFixed(2)}
                </Badge>
                <Button size="sm" onClick={bulkMarkPaid} disabled={busy} className="gap-1">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Marcar como recebidas
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar paciente ou descrição"
                className="pl-8 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-full sm:w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos abertos</SelectItem>
                <SelectItem value="pending">A vencer</SelectItem>
                <SelectItem value="overdue">Em atraso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gaps: active plans without open charge */}
          {plansMissingCharge.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                {plansMissingCharge.length} plano(s) ativo(s) sem cobrança em aberto
              </div>
              <div className="space-y-1.5">
                {plansMissingCharge.slice(0, 5).map((p) => {
                  const patient = patients.find((x) => x.id === p.patient_id);
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-xs bg-background/60 rounded px-2.5 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Repeat className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">
                          <strong>{patient?.full_name || "Paciente"}</strong> · R$ {Number(p.amount).toFixed(2)} · {p.billing_type}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1"
                        onClick={() => createChargeForPlan(p)}
                      >
                        <Plus className="h-3 w-3" /> Criar cobrança
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending list */}
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/40" />
              Tudo conciliado — nenhuma cobrança em aberto.
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-2 py-1 text-[11px] text-muted-foreground">
                <Checkbox
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onCheckedChange={toggleAll}
                  className="h-3.5 w-3.5"
                />
                <span>Selecionar tudo ({filtered.length})</span>
              </div>
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors ${
                    selected.has(t.id) ? "border-primary bg-primary/5" : "hover:border-primary/40"
                  }`}
                >
                  <Checkbox
                    checked={selected.has(t.id)}
                    onCheckedChange={() => toggle(t.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{t._patient_name}</span>
                      {t.billing_plan_id && (
                        <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-700 dark:text-violet-300">
                          <Repeat className="h-2.5 w-2.5 mr-0.5" /> Plano
                        </Badge>
                      )}
                      {t._overdue ? (
                        <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-700 dark:text-red-400">
                          <AlertCircle className="h-2.5 w-2.5 mr-0.5" /> Em atraso
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400">
                          A vencer
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {t.description || "Cobrança"} · vence {format(new Date(t.due_date + "T00:00:00"), "dd/MM/yyyy")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-sm">R$ {Number(t.amount).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recently paid → quick revert */}
          {paidRecent.length > 0 && (
            <div className="pt-4 border-t">
              <div className="text-xs font-semibold text-muted-foreground mb-2">Pagos recentemente</div>
              <div className="space-y-1">
                {paidRecent.map((t) => {
                  const patient = patients.find((p) => p.id === t.patient_id);
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded bg-muted/40">
                      <span className="truncate">
                        <CheckCircle2 className="inline h-3 w-3 text-emerald-500 mr-1" />
                        {patient?.full_name || "—"} · R$ {Number(t.amount).toFixed(2)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => revertPaid(t.id)}
                      >
                        <RotateCcw className="h-3 w-3" /> Estornar
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SmartTransactionDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setLockedPatient(null);
        }}
        lockedPatient={lockedPatient as any}
        defaultType="income"
        onCreated={() => {
          load();
          onChanged?.();
        }}
      />
    </>
  );
}
