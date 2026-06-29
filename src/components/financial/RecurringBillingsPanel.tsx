import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Repeat, Plus, Trash2, CalendarClock, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

interface Patient { id: string; full_name: string; }
interface Rule {
  id: string;
  patient_id: string;
  amount: number;
  description: string | null;
  billing_day: number;
  is_active: boolean;
  auto_send_link: boolean;
  channel: string;
  next_run_date: string;
  last_run_date: string | null;
  patient_name?: string;
}

function nextRun(day: number): string {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), day);
  if (target <= today) target.setMonth(target.getMonth() + 1);
  return target.toISOString().slice(0, 10);
}

export function RecurringBillingsPanel({ onChanged }: { onChanged?: () => void } = {}) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id: "",
    amount: "",
    description: "Mensalidade",
    billing_day: 5,
    auto_send_link: true,
    channel: "whatsapp",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: rs }, { data: ps }] = await Promise.all([
      supabase.from("recurring_billings" as any).select("*").eq("psychologist_id", user.id).order("created_at", { ascending: false }),
      supabase.from("patients").select("id, full_name").eq("psychologist_id", user.id).is("deleted_at", null).order("full_name"),
    ]);
    const pmap = new Map((ps || []).map((p) => [p.id, p.full_name]));
    setRules(((rs as any) || []).map((r: Rule) => ({ ...r, patient_name: pmap.get(r.patient_id) })));
    setPatients(ps || []);
    setLoading(false);
  }

  async function save() {
    if (!form.patient_id || !form.amount) {
      toast.error("Selecione paciente e valor");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("recurring_billings" as any).insert({
      psychologist_id: user.id,
      patient_id: form.patient_id,
      amount: parseFloat(form.amount),
      description: form.description,
      billing_day: form.billing_day,
      auto_send_link: form.auto_send_link,
      channel: form.channel,
      next_run_date: nextRun(form.billing_day),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Cobrança recorrente criada");
    setOpen(false);
    setForm({ patient_id: "", amount: "", description: "Mensalidade", billing_day: 5, auto_send_link: true, channel: "whatsapp" });
    load();
  }

  async function toggle(rule: Rule) {
    await supabase.from("recurring_billings" as any).update({ is_active: !rule.is_active }).eq("id", rule.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta cobrança recorrente?")) return;
    await supabase.from("recurring_billings" as any).delete().eq("id", id);
    toast.success("Removida");
    load();
    onChanged?.();
  }

  async function generateNow(rule: Rule) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const t = toast.loading("Gerando cobrança...");
    const { error } = await supabase.from("financial_transactions").insert({
      psychologist_id: user.id,
      patient_id: rule.patient_id,
      type: "income",
      status: "pending",
      amount: Number(rule.amount),
      due_date: rule.next_run_date || new Date().toISOString().slice(0, 10),
      description: rule.description || `Cobrança recorrente — ${rule.patient_name || "Paciente"}`,
      payment_method: "pix",
      category: "Pacote mensal",
    } as any);
    if (error) { toast.error(error.message, { id: t }); return; }
    await supabase.from("recurring_billings" as any)
      .update({ last_run_date: new Date().toISOString().slice(0, 10) })
      .eq("id", rule.id);
    toast.success("Cobrança gerada", { id: t });
    load();
    onChanged?.();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Repeat className="h-5 w-5 text-primary" />
          Cobranças Recorrentes
          <Badge variant="secondary">{rules.length}</Badge>
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova cobrança recorrente</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Paciente</Label>
                <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Dia do mês</Label>
                  <Input type="number" min={1} max={28} value={form.billing_day} onChange={(e) => setForm({ ...form, billing_day: parseInt(e.target.value || "5") })} />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Canal de envio</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Gerar link Stripe automaticamente</p>
                  <p className="text-xs text-muted-foreground">Cria o link no dia da cobrança</p>
                </div>
                <Switch checked={form.auto_send_link} onCheckedChange={(v) => setForm({ ...form, auto_send_link: v })} />
              </div>
              <Button onClick={save} disabled={saving} className="w-full gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Criar cobrança
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Repeat className="h-10 w-10 mx-auto mb-2 opacity-40" />
            Nenhuma cobrança recorrente configurada
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/40 transition-colors">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${r.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.patient_name || "Paciente"}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {Number(r.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · dia {r.billing_day} · {r.channel}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => generateNow(r)} disabled={!r.is_active}>
                  <Zap className="h-3.5 w-3.5" />Gerar
                </Button>
                <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} />
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
