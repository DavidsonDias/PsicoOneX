import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LIFECYCLE_STATUSES,
  LifecycleStatus,
  getLifecycleMeta,
} from "@/lib/patient-lifecycle";

interface Props {
  patientId: string;
  psychologistId: string;
  currentStatus: string | null;
  onChanged?: (newStatus: LifecycleStatus) => void;
}

interface HistoryRow {
  id: string;
  previous_status: string | null;
  new_status: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export function PatientLifecycleManager({
  patientId,
  psychologistId,
  currentStatus,
  onChanged,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LifecycleStatus | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const current = getLifecycleMeta(currentStatus);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("patient_status_history")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data || []) as HistoryRow[]);
  };

  useEffect(() => {
    if (open) loadHistory();
  }, [open, patientId]);

  const handleSave = async () => {
    if (!selected) return;
    const meta = getLifecycleMeta(selected);
    if (meta.requiresReason && !reason.trim()) {
      toast.error("Informe o motivo da mudança de status");
      return;
    }
    setSaving(true);
    try {
      const { error: e1 } = await supabase
        .from("patients")
        .update({
          lifecycle_status: selected,
          lifecycle_reason: reason || null,
          lifecycle_updated_at: new Date().toISOString(),
        })
        .eq("id", patientId);
      if (e1) throw e1;

      const { error: e2 } = await supabase.from("patient_status_history").insert({
        patient_id: patientId,
        psychologist_id: psychologistId,
        changed_by: psychologistId,
        previous_status: currentStatus,
        new_status: selected,
        reason: reason || null,
        notes: notes || null,
      });
      if (e2) throw e2;

      toast.success(`Status alterado para ${meta.label}`);
      onChanged?.(selected);
      setSelected(null);
      setReason("");
      setNotes("");
      loadHistory();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao atualizar status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition hover:opacity-80",
          current.className
        )}
        title="Alterar status do paciente"
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", current.dot)} />
        {current.label}
        <ChevronRight className="h-3 w-3 opacity-70" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Ciclo de Vida do Paciente
            </DialogTitle>
            <DialogDescription>
              Atual: <Badge className={cn("ml-1", current.className)}>{current.label}</Badge>{" "}
              <span className="text-xs text-muted-foreground">— {current.description}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Novo status</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {LIFECYCLE_STATUSES.map((s) => {
                  const isCurrent = s.value === currentStatus;
                  const isSelected = s.value === selected;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => setSelected(s.value)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition text-xs",
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50",
                        isCurrent && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                        {s.label}
                        {isCurrent && <span className="text-[10px] text-muted-foreground">(atual)</span>}
                      </div>
                      <div className="text-muted-foreground mt-0.5">{s.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 rounded-lg border bg-muted/30 p-4"
              >
                <div>
                  <Label htmlFor="lc-reason">
                    Motivo {getLifecycleMeta(selected).requiresReason && <span className="text-destructive">*</span>}
                  </Label>
                  <Textarea
                    id="lc-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex.: Paciente solicitou pausa por motivos pessoais"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="lc-notes">Observações internas (opcional)</Label>
                  <Textarea
                    id="lc-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anotações clínicas, encaminhamento, contato sugerido…"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "Salvando…" : "Confirmar mudança"}
                  </Button>
                </div>
              </motion.div>
            )}

            <div>
              <Label className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico de mudanças
              </Label>
              <ScrollArea className="h-56 mt-2 rounded-lg border">
                <div className="p-3 space-y-2">
                  {history.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Nenhuma mudança registrada ainda.
                    </p>
                  ) : (
                    history.map((h) => {
                      const from = getLifecycleMeta(h.previous_status);
                      const to = getLifecycleMeta(h.new_status);
                      return (
                        <div key={h.id} className="text-xs border-l-2 border-primary/30 pl-3 py-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {h.previous_status && (
                              <>
                                <Badge variant="outline" className={cn("text-[10px]", from.className)}>
                                  {from.label}
                                </Badge>
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              </>
                            )}
                            <Badge variant="outline" className={cn("text-[10px]", to.className)}>
                              {to.label}
                            </Badge>
                            <span className="text-muted-foreground ml-auto">
                              {format(new Date(h.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {h.reason && <p className="mt-1 text-muted-foreground">{h.reason}</p>}
                          {h.notes && <p className="mt-0.5 italic text-muted-foreground/80">{h.notes}</p>}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
