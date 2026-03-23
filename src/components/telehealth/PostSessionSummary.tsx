import { memo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Save, FileText, Brain, ClipboardList, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ChatMessage } from "@/hooks/useTelehealthChat";

interface PostSessionSummaryProps {
  sessionId: string;
  patientId: string;
  patientName: string;
  chatMessages: ChatMessage[];
  durationSeconds: number;
  onSavedToRecord: (recordId: string) => void;
  onClose: () => void;
}

export const PostSessionSummary = memo(function PostSessionSummary({
  sessionId, patientId, patientName, chatMessages, durationSeconds,
  onSavedToRecord, onClose,
}: PostSessionSummaryProps) {
  const [standardSummary, setStandardSummary] = useState("");
  const [structuredSummary, setStructuredSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [clinicalApproach, setClinicalApproach] = useState("neutral");
  const [activeTab, setActiveTab] = useState("standard");

  // Output toggles
  const [enableStandard, setEnableStandard] = useState(true);
  const [enableStructured, setEnableStructured] = useState(true);

  useEffect(() => {
    loadApproach();
  }, []);

  const loadApproach = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data } = await supabase.from("profiles").select("preferred_clinical_style").eq("id", session.user.id).single();
    if (data?.preferred_clinical_style) setClinicalApproach(data.preferred_clinical_style);
  };

  const chatContext = chatMessages.map((m) => `${m.senderName}: ${m.text}`).join("\n") || "Nenhuma mensagem de chat registrada.";
  const durationMin = Math.round(durationSeconds / 60);

  const generateSummary = async (type: "summary" | "structured") => {
    setGenerating(true);
    setGeneratingType(type === "summary" ? "Resumo clínico" : "Prontuário estruturado");
    try {
      const { data, error } = await supabase.functions.invoke("summarize-session", {
        body: {
          patientName,
          duration: durationMin,
          chatMessages: chatContext,
          clinicalApproach,
          outputType: type,
        },
      });

      if (error) throw error;
      const result = data?.summary || "Não foi possível gerar.";

      if (type === "summary") setStandardSummary(result);
      else setStructuredSummary(result);

      toast.success(`${type === "summary" ? "Resumo" : "Prontuário"} gerado!`);
    } catch (e) {
      console.error("Summary generation error:", e);
      toast.error("Erro ao gerar com IA");
    } finally {
      setGenerating(false);
      setGeneratingType("");
    }
  };

  const generateAll = async () => {
    if (enableStandard) await generateSummary("summary");
    if (enableStructured) await generateSummary("structured");
  };

  const saveToRecord = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { count } = await supabase
        .from("medical_records")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patientId)
        .eq("psychologist_id", session.user.id)
        .is("deleted_at", null);

      const observations = [standardSummary, structuredSummary].filter(Boolean).join("\n\n---\n\n");

      const { data: record, error } = await supabase
        .from("medical_records")
        .insert({
          patient_id: patientId,
          psychologist_id: session.user.id,
          session_date: format(new Date(), "yyyy-MM-dd"),
          session_number: (count || 0) + 1,
          observations: observations || "Sessão de teleatendimento sem resumo gerado.",
          evolution: `Sessão de teleatendimento - Duração: ${durationMin} minutos`,
        })
        .select("id")
        .single();

      if (error) throw error;

      await supabase
        .from("telehealth_sessions")
        .update({
          ai_summary: observations,
          medical_record_id: record.id,
          chat_messages: chatMessages,
        } as any)
        .eq("id", sessionId);

      toast.success("Prontuário criado com sucesso!");
      onSavedToRecord(record.id);
    } catch (e) {
      console.error("Save to record error:", e);
      toast.error("Erro ao salvar prontuário");
    } finally {
      setSaving(false);
    }
  };

  const hasSummary = !!standardSummary || !!structuredSummary;

  const approachLabels: Record<string, string> = {
    neutral: "Genérico",
    tcc: "TCC",
    psychoanalysis: "Psicanálise",
    phenomenological: "Fenomenológica",
    humanistic: "Humanista",
    systemic: "Sistêmica",
    gestalt: "Gestalt",
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Sessão finalizada</h2>
          <p className="text-sm text-muted-foreground">
            {patientName} · {durationMin} min
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            <Brain className="h-3 w-3 mr-1" />
            {approachLabels[clinicalApproach] || "Genérico"}
          </Badge>
          <Badge variant="secondary">
            <FileText className="h-3 w-3 mr-1" />
            Teleatendimento
          </Badge>
        </div>
      </div>

      {/* Output toggles */}
      {!hasSummary && (
        <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
          <p className="text-sm font-medium">Selecione os tipos de saída:</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-standard" className="text-sm">Resumo clínico padrão</Label>
              <Switch id="enable-standard" checked={enableStandard} onCheckedChange={setEnableStandard} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-structured" className="text-sm">Prontuário estruturado</Label>
              <Switch id="enable-structured" checked={enableStructured} onCheckedChange={setEnableStructured} />
            </div>
          </div>
        </div>
      )}

      {!hasSummary && (
        <Button onClick={generateAll} disabled={generating || (!enableStandard && !enableStructured)} className="w-full gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? `Gerando ${generatingType}...` : "Gerar com IA"}
        </Button>
      )}

      {hasSummary && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full">
            {standardSummary && (
              <TabsTrigger value="standard" className="flex-1 gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" /> Resumo
              </TabsTrigger>
            )}
            {structuredSummary && (
              <TabsTrigger value="structured" className="flex-1 gap-1.5 text-xs">
                <ClipboardList className="h-3.5 w-3.5" /> Prontuário
              </TabsTrigger>
            )}
          </TabsList>

          {standardSummary && (
            <TabsContent value="standard" className="space-y-2">
              <Textarea value={standardSummary} onChange={(e) => setStandardSummary(e.target.value)} rows={10} className="resize-none text-sm" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => generateSummary("summary")} disabled={generating} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerar
                </Button>
              </div>
            </TabsContent>
          )}

          {structuredSummary && (
            <TabsContent value="structured" className="space-y-2">
              <Textarea value={structuredSummary} onChange={(e) => setStructuredSummary(e.target.value)} rows={12} className="resize-none text-sm" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => generateSummary("structured")} disabled={generating} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerar
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}

      {hasSummary && (
        <div className="flex gap-3">
          <Button onClick={saveToRecord} disabled={saving} className="flex-1 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar no prontuário
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      )}

      {!hasSummary && !generating && (
        <Button variant="outline" onClick={onClose} className="w-full">
          Fechar sem resumo
        </Button>
      )}
    </Card>
  );
});
