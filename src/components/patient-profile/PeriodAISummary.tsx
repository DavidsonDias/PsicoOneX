import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, Target } from "lucide-react";
import { toast } from "sonner";

interface Props {
  patientId: string;
  patientName: string;
}

interface SummaryResult {
  headline: string;
  summary: string;
  progress: "positive" | "neutral" | "negative";
  keyThemes: string[];
  techniquesUsed: string[];
  alerts: string[];
  suggestedFocus: string[];
}

export function PeriodAISummary({ patientId, patientName }: Props) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const periodDays = parseInt(period);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - periodDays);

      const { data: records, error } = await supabase
        .from("medical_records")
        .select("id, session_date, session_number, complaints, observations, evolution, techniques_used, next_steps")
        .eq("patient_id", patientId)
        .is("deleted_at", null)
        .gte("session_date", fromDate.toISOString().slice(0, 10))
        .order("session_date", { ascending: true });

      if (error) throw error;
      if (!records || records.length === 0) {
        toast.info("Sem prontuários no período selecionado");
        setLoading(false);
        return;
      }

      const payload = records.map((r) => ({
        id: r.id,
        session: r.session_number,
        date: r.session_date,
        complaints: r.complaints,
        observations: r.observations,
        evolution: r.evolution,
        techniques: r.techniques_used,
        nextSteps: r.next_steps,
      }));

      const { data, error: aiError } = await supabase.functions.invoke("clinical-ai", {
        body: { type: "period-summary", patientName, periodDays, records: payload },
      });
      if (aiError) throw aiError;
      setResult(data as SummaryResult);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar resumo");
    } finally {
      setLoading(false);
    }
  };

  const progressIcon = result?.progress === "positive" ? TrendingUp : result?.progress === "negative" ? TrendingDown : Minus;
  const progressColor = result?.progress === "positive" ? "text-green-500" : result?.progress === "negative" ? "text-red-500" : "text-amber-500";
  const ProgressIcon = progressIcon;

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4 text-primary" />
        Resumo IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Resumo Clínico do Período
            </DialogTitle>
            <DialogDescription>
              Visão executiva gerada por IA com base nos prontuários de {patientName}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 mt-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Analisando..." : "Gerar"}
            </Button>
          </div>

          {result && (
            <div className="space-y-4 mt-4">
              <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${progressColor}`}>
                      <ProgressIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-base">{result.headline}</p>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{result.summary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {result.keyThemes?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">TEMAS PRINCIPAIS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keyThemes.map((t) => (
                      <Badge key={t} variant="secondary">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.techniquesUsed?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">TÉCNICAS UTILIZADAS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.techniquesUsed.map((t) => (
                      <Badge key={t} variant="outline">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.alerts?.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="py-3">
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> ALERTAS CLÍNICOS
                    </p>
                    <ul className="space-y-1">
                      {result.alerts.map((a, i) => (
                        <li key={i} className="text-sm">• {a}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {result.suggestedFocus?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Target className="h-3 w-3" /> FOCO SUGERIDO
                  </p>
                  <ul className="space-y-1">
                    {result.suggestedFocus.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground">→ {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
