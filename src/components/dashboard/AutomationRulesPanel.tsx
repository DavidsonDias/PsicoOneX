import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Zap, Plus, Power, PowerOff, Trash2,
  CalendarX, CreditCard, FileText, UserX, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  action_type: string;
  trigger_config: any;
  action_config: any;
  is_active: boolean;
  trigger_count: number;
  last_triggered_at: string | null;
}

const triggerTypes = [
  { value: "missed_appointment", label: "Paciente falta à sessão", icon: CalendarX, config: { count: 2 } },
  { value: "overdue_payment", label: "Pagamento atrasado", icon: CreditCard, config: { days: 3 } },
  { value: "session_completed", label: "Sessão finalizada", icon: FileText, config: {} },
  { value: "patient_inactive", label: "Paciente inativo", icon: UserX, config: { days: 14 } },
];

const actionTypes = [
  { value: "send_notification", label: "Enviar notificação", icon: Bell },
  { value: "generate_record", label: "Gerar prontuário", icon: FileText },
  { value: "change_status", label: "Alterar status", icon: Power },
];

const triggerIcons: Record<string, React.ElementType> = {
  missed_appointment: CalendarX,
  overdue_payment: CreditCard,
  session_completed: FileText,
  patient_inactive: UserX,
};

export function AutomationRulesPanel() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    trigger_type: "",
    action_type: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (e) {
      console.error("Error loading rules:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("automation_rules")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
      setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: isActive } : r));
      toast.success(isActive ? "Automação ativada" : "Automação desativada");
    } catch (e) {
      toast.error("Erro ao atualizar automação");
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from("automation_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success("Automação removida");
    } catch (e) {
      toast.error("Erro ao remover automação");
    }
  };

  const createRule = async () => {
    if (!newRule.name || !newRule.trigger_type || !newRule.action_type) {
      toast.error("Preencha todos os campos");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const triggerDef = triggerTypes.find(t => t.value === newRule.trigger_type);
      const triggerLabel = triggerDef?.label || newRule.trigger_type;
      const actionLabel = actionTypes.find(a => a.value === newRule.action_type)?.label || newRule.action_type;

      const { error } = await supabase.from("automation_rules").insert({
        psychologist_id: user.id,
        name: newRule.name,
        description: `${triggerLabel} → ${actionLabel}`,
        trigger_type: newRule.trigger_type,
        trigger_config: triggerDef?.config || {},
        action_type: newRule.action_type,
        action_config: {},
      });

      if (error) throw error;
      toast.success("Automação criada!");
      setShowCreate(false);
      setNewRule({ name: "", trigger_type: "", action_type: "" });
      loadRules();
    } catch (e) {
      toast.error("Erro ao criar automação");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            Automações
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {rules.filter(r => r.is_active).length} ativas
            </Badge>
          </CardTitle>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Nova Automação
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nome da regra</Label>
                  <Input
                    placeholder="Ex: Lembrete de faltas"
                    value={newRule.name}
                    onChange={e => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quando (Gatilho)</Label>
                  <Select
                    value={newRule.trigger_type}
                    onValueChange={v => setNewRule(prev => ({ ...prev, trigger_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gatilho" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="flex items-center gap-2">
                            <t.icon className="h-4 w-4" />
                            {t.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Então (Ação)</Label>
                  <Select
                    value={newRule.action_type}
                    onValueChange={v => setNewRule(prev => ({ ...prev, action_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a ação" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map(a => (
                        <SelectItem key={a.value} value={a.value}>
                          <span className="flex items-center gap-2">
                            <a.icon className="h-4 w-4" />
                            {a.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newRule.trigger_type && newRule.action_type && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground">Resumo:</p>
                    <p className="text-sm font-medium mt-1">
                      SE {triggerTypes.find(t => t.value === newRule.trigger_type)?.label}
                      {" → "}
                      {actionTypes.find(a => a.value === newRule.action_type)?.label}
                    </p>
                  </div>
                )}

                <Button onClick={createRule} className="w-full" disabled={saving}>
                  {saving ? "Criando..." : "Criar Automação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {rules.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma automação criada</p>
            <Button variant="link" size="sm" onClick={() => setShowCreate(true)}>
              Criar primeira regra
            </Button>
          </div>
        ) : (
          rules.map((rule, index) => {
            const TriggerIcon = triggerIcons[rule.trigger_type] || Zap;
            return (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  rule.is_active ? "bg-background" : "bg-muted/30 opacity-60"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  rule.is_active ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
                )}>
                  <TriggerIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rule.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {rule.trigger_count > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {rule.trigger_count}x
                    </Badge>
                  )}
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={v => toggleRule(rule.id, v)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
