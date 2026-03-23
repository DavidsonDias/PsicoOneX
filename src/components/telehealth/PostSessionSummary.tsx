import { memo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, Sparkles, Save, FileText, Brain, ClipboardList, RefreshCw,
  Wand2, ScrollText, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ChatMessage } from "@/hooks/useTelehealthChat";
import type { TranscriptEntry } from "@/hooks/useSessionTranscription";

interface PostSessionSummaryProps {
  sessionId: string;
  patientId: string;
  patientName: string;
  chatMessages: ChatMessage[];
  durationSeconds: number;
  transcript?: TranscriptEntry[];
  onSavedToRecord: (recordId: string) => void;
  onClose: () => void;
}

export const PostSessionSummary = memo(function PostSessionSummary({
  sessionId, patientId, patientName, chatMessages, durationSeconds,
  transcript = [], onSavedToRecord, onClose,
}: PostSessionSummaryProps) {
  const [standardSummary, setStandardSummary] = useState("");
  const [structuredSummary, setStructuredSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState("");
  const [refining, setRefining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clinicalApproach, setClinicalApproach] = useState("neutral");
  const [activeTab, setActiveTab] = useState("standard");
  const [patientHistory, setPatientHistory] = useState("");

  // Output toggles
  const [enableStandard, setEnableStandard] = useState(true);
  const [enableStructured, setEnableStructured] = useState(true);

  useEffect(() => {
    loadApproach();
    loadPatientHistory();
  }, []);

  const loadApproach = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data } = await supabase.from("profiles").select("preferred_clinical_style").eq("id", session.user.id).single();
    if (data?.preferred_clinical_style) setClinicalApproach(data.preferred_clinical_style);
  };

  const loadPatientHistory = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: records } = await supabase
      .from("medical_records")
      .select("session_date, session_number, observations, evolution, complaints, next_steps")
      .eq("patient_id", patientId)
      .eq("psychologist_id", session.user.id)
      .is("deleted_at", null)
      .order("session_date", { ascending: false })
      .limit(3);

    if (records && records.length > 0) {
      const history = records.map((r, i) => {
        const parts = [
          `### Sessão ${r.session_number || records.length - i} (${r.session_date})`,
          r.complaints && `Queixas: ${r.complaints}`,
          r.observations && `Observações: ${r.observations?.substring(0, 300)}`,
          r.evolution && `Evolução: ${r.evolution?.substring(0, 200)}`,
          r.next_steps && `Próximos passos: ${r.next_steps}`,
        ].filter(Boolean);
        return parts.join("\n");
      }).join("\n\n");
      setPatientHistory(history);
    }
  };

  const transcriptText = transcript
    .filter((e) => e.isFinal)
    .map((e) => `${e.speakerLabel}: ${e.text}`)
    .join("\n");

  const chatContext = chatMessages.map((m) => `${m.senderName}: ${m.text}`).join("\n");
  const sessionContent = [transcriptText, chatContext].filter(Boolean).join("\n\n--- Chat ---\n\n") || "Nenhuma informação registrada.";
  const durationMin = Math.round(durationSeconds / 60);

  const generateSummary = async (type: "summary" | "structured") => {
    setGenerating(true);
    setGeneratingType(type === "summary" ? "Resumo clínico" : "Prontuário estruturado");
    try {
      const body: any = {
        patientName,
        duration: durationMin,
        chatMessages: sessionContent,
        clinicalApproach,
        outputType: type,
      };
      if (patientHistory) body.patientHistory = patientHistory;

      const { data, error } = await supabase.functions.invoke("summarize-session", { body });
      if (error) throw error;

      const result = data?.summary || "Não foi possível gerar.";
      if (type === "summary") {
        setStandardSummary(result);
        setActiveTab("standard");
      } else {
        setStructuredSummary(result);
        setActiveTab("structured");
      }
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

  // Refinement actions
  const refineText = async (action: string) => {
    const currentText = activeTab === "standard" ? standardSummary : structuredSummary;
    if (!currentText) return;

    setRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-session", {
        body: {
          patientName,
          duration: durationMin,
          chatMessages: currentText,
          clinicalApproach,
          outputType: "refine",
          refineAction: action,
        },
      });
      if (error) throw error;
      const result = data?.summary || currentText;

      if (activeTab === "standard") setStandardSummary(result);
      else setStructuredSummary(result);

      toast.success("Texto refinado!");
    } catch (e) {
      console.error("Refine error:", e);
      toast.error("Erro ao refinar texto");
    } finally {
      setRefining(false);
    }
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

      const fullContent = [observations, transcriptText && `\n\n--- Transcrição ---\n\n${transcriptText}`].filter(Boolean).join("");

      await supabase
        .from("telehealth_sessions")
        .update({
          ai_summary: fullContent,
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
  const hasTranscript = transcript.length > 0;

  const approachLabels: Record<string, string> = {
    neutral: "Genérico", tcc: "TCC", psychoanalysis: "Psicanálise",
    phenomenological: "Fenomenológica", humanistic: "Humanista",
    systemic: "Sistêmica", gestalt: "Gestalt",
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Sessão finalizada</h2>
          <p className="text-sm text-muted-foreground">
            {patientName} · {durationMin} min
            {hasTranscript && ` · ${transcript.length} segmentos transcritos`}
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

      {patientHistory && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Brain className="h-3 w-3" />
            Contexto clínico das últimas {Math.min(3, patientHistory.split("###").length - 1)} sessões será incluído na análise
          </p>
        </div>
      )}

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

      {(hasSummary || hasTranscript) && (
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
            {hasTranscript && (
              <TabsTrigger value="transcript" className="flex-1 gap-1.5 text-xs">
                <ScrollText className="h-3.5 w-3.5" /> Transcrição
              </TabsTrigger>
            )}
          </TabsList>

          {standardSummary && (
            <TabsContent value="standard" className="space-y-2">
              <Textarea value={standardSummary} onChange={(e) => setStandardSummary(e.target.value)} rows={10} className="resize-none text-sm" />
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => generateSummary("summary")} disabled={generating || refining} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerar
                </Button>
                <RefineMenu onRefine={refineText} disabled={refining} />
              </div>
            </TabsContent>
          )}

          {structuredSummary && (
            <TabsContent value="structured" className="space-y-2">
              <Textarea value={structuredSummary} onChange={(e) => setStructuredSummary(e.target.value)} rows={12} className="resize-none text-sm" />
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => generateSummary("structured")} disabled={generating || refining} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerar
                </Button>
                <RefineMenu onRefine={refineText} disabled={refining} />
              </div>
            </TabsContent>
          )}

          {hasTranscript && (
            <TabsContent value="transcript" className="space-y-2">
              <div className="max-h-80 overflow-y-auto space-y-2 p-3 rounded-lg bg-muted/20 border border-border">
                {transcript.filter(e => e.isFinal).map((entry) => (
                  <div key={entry.id} className="text-sm">
                    <span className={`font-medium ${entry.speaker === "local" ? "text-primary" : "text-foreground"}`}>
                      {entry.speakerLabel}:
                    </span>{" "}
                    <span className="text-muted-foreground">{entry.text}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{transcript.filter(e => e.isFinal).length} segmentos</p>
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
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      )}

      {!hasSummary && !generating && (
        <Button variant="outline" onClick={onClose} className="w-full">Fechar sem resumo</Button>
      )}
    </Card>
  );
});

function RefineMenu({ onRefine, disabled }: { onRefine: (action: string) => void; disabled: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-1.5">
          {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          Refinar
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onRefine("technical")}>Reescrever mais técnico</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRefine("simplify")}>Simplificar linguagem</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRefine("empathetic")}>Tornar mais empático</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRefine("approach")}>Adaptar à abordagem</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
