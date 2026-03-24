import { memo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, Sparkles, Save, FileText, Brain, ClipboardList, RefreshCw,
  Wand2, ScrollText, ChevronDown, History, RotateCcw, Edit3,
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

interface VersionEntry {
  content: string;
  timestamp: string;
  action: string;
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
  const [isEditing, setIsEditing] = useState(false);

  // Output toggles
  const [enableStandard, setEnableStandard] = useState(true);
  const [enableStructured, setEnableStructured] = useState(true);

  // Version history
  const [standardVersions, setStandardVersions] = useState<VersionEntry[]>([]);
  const [structuredVersions, setStructuredVersions] = useState<VersionEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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
      .eq("patient_id", patientId).eq("psychologist_id", session.user.id)
      .is("deleted_at", null).order("session_date", { ascending: false }).limit(3);

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

  const pushVersion = useCallback((type: "standard" | "structured", content: string, action: string) => {
    const entry: VersionEntry = { content, timestamp: new Date().toISOString(), action };
    if (type === "standard") {
      setStandardVersions(prev => [entry, ...prev].slice(0, 10));
    } else {
      setStructuredVersions(prev => [entry, ...prev].slice(0, 10));
    }
  }, []);

  const restoreVersion = useCallback((type: "standard" | "structured", version: VersionEntry) => {
    if (type === "standard") setStandardSummary(version.content);
    else setStructuredSummary(version.content);
    toast.success("Versão restaurada");
  }, []);

  const transcriptText = transcript
    .filter((e) => e.isFinal)
    .map((e) => `[${e.speakerLabel}]: ${e.text}`)
    .join("\n");

  const chatContext = chatMessages.map((m) => `${m.senderName}: ${m.text}`).join("\n");
  const sessionContent = [transcriptText, chatContext].filter(Boolean).join("\n\n--- Chat ---\n\n") || "Nenhuma informação registrada.";
  const durationMin = Math.round(durationSeconds / 60);

  const generateSummary = async (type: "summary" | "structured") => {
    setGenerating(true);
    setGeneratingType(type === "summary" ? "Resumo clínico" : "Prontuário estruturado");
    try {
      const body: any = {
        patientName, duration: durationMin, chatMessages: sessionContent,
        clinicalApproach, outputType: type,
      };
      if (patientHistory) body.patientHistory = patientHistory;

      const { data, error } = await supabase.functions.invoke("summarize-session", { body });
      if (error) throw error;

      const result = data?.summary || "Não foi possível gerar.";
      if (type === "summary") {
        setStandardSummary(result);
        pushVersion("standard", result, "Geração IA");
        setActiveTab("standard");
      } else {
        setStructuredSummary(result);
        pushVersion("structured", result, "Geração IA");
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

  const refineText = async (action: string) => {
    const currentText = activeTab === "standard" ? standardSummary : structuredSummary;
    if (!currentText) return;

    // Save current version before refining
    pushVersion(activeTab === "standard" ? "standard" : "structured", currentText, "Antes de refinar");

    setRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-session", {
        body: {
          patientName, duration: durationMin, chatMessages: currentText,
          clinicalApproach, outputType: "refine", refineAction: action,
        },
      });
      if (error) throw error;
      const result = data?.summary || currentText;

      if (activeTab === "standard") {
        setStandardSummary(result);
        pushVersion("standard", result, `Refinado: ${action}`);
      } else {
        setStructuredSummary(result);
        pushVersion("structured", result, `Refinado: ${action}`);
      }
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

      const { count } = await supabase.from("medical_records")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patientId).eq("psychologist_id", session.user.id).is("deleted_at", null);

      const observations = [standardSummary, structuredSummary].filter(Boolean).join("\n\n---\n\n");

      const { data: record, error } = await supabase.from("medical_records")
        .insert({
          patient_id: patientId,
          psychologist_id: session.user.id,
          session_date: format(new Date(), "yyyy-MM-dd"),
          session_number: (count || 0) + 1,
          observations: observations || "Sessão de teleatendimento sem resumo gerado.",
          evolution: `Sessão de teleatendimento - Duração: ${durationMin} minutos`,
        })
        .select("id").single();

      if (error) throw error;

      const fullContent = [observations, transcriptText && `\n\n--- Transcrição ---\n\n${transcriptText}`].filter(Boolean).join("");
      await supabase.from("telehealth_sessions")
        .update({ ai_summary: fullContent, medical_record_id: record.id, chat_messages: chatMessages } as any)
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
  const currentVersions = activeTab === "standard" ? standardVersions : structuredVersions;

  const approachLabels: Record<string, string> = {
    neutral: "Genérico", tcc: "TCC", psychoanalysis: "Psicanálise",
    phenomenological: "Fenomenológica", humanistic: "Humanista",
    systemic: "Sistêmica", gestalt: "Gestalt",
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Sessão finalizada</h2>
          <p className="text-sm text-muted-foreground">
            {patientName} · {durationMin} min
            {hasTranscript && ` · ${transcript.length} segmentos`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Brain className="h-3 w-3 mr-1" />
            {approachLabels[clinicalApproach] || "Genérico"}
          </Badge>
        </div>
      </div>

      {/* Clinical context indicator */}
      {patientHistory && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Brain className="h-3 w-3" />
            Contexto clínico das últimas sessões incluído na análise
          </p>
        </div>
      )}

      {/* Output toggles */}
      {!hasSummary && !generating && (
        <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
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

      {/* Generate button with skeleton loading */}
      {!hasSummary && (
        <>
          <Button onClick={generateAll} disabled={generating || (!enableStandard && !enableStructured)} className="w-full gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? `Gerando ${generatingType}...` : "Gerar com IA"}
          </Button>
          {generating && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          )}
        </>
      )}

      {/* Content tabs */}
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
            <TabsContent value="standard" className="space-y-3">
              <Textarea
                value={standardSummary}
                onChange={(e) => setStandardSummary(e.target.value)}
                rows={10}
                className="resize-none text-sm leading-relaxed"
                readOnly={!isEditing}
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (isEditing) pushVersion("standard", standardSummary, "Edição manual");
                    setIsEditing(!isEditing);
                  }}
                  className="gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {isEditing ? "Salvar edição" : "Editar"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => generateSummary("summary")} disabled={generating || refining} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerar
                </Button>
                <RefineMenu onRefine={refineText} disabled={refining} />
                {standardVersions.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-1.5">
                    <History className="h-3.5 w-3.5" />
                    Versões ({standardVersions.length})
                  </Button>
                )}
              </div>
            </TabsContent>
          )}

          {structuredSummary && (
            <TabsContent value="structured" className="space-y-3">
              <Textarea
                value={structuredSummary}
                onChange={(e) => setStructuredSummary(e.target.value)}
                rows={12}
                className="resize-none text-sm leading-relaxed"
                readOnly={!isEditing}
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (isEditing) pushVersion("structured", structuredSummary, "Edição manual");
                    setIsEditing(!isEditing);
                  }}
                  className="gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {isEditing ? "Salvar edição" : "Editar"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => generateSummary("structured")} disabled={generating || refining} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerar
                </Button>
                <RefineMenu onRefine={refineText} disabled={refining} />
                {structuredVersions.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-1.5">
                    <History className="h-3.5 w-3.5" />
                    Versões ({structuredVersions.length})
                  </Button>
                )}
              </div>
            </TabsContent>
          )}

          {hasTranscript && (
            <TabsContent value="transcript" className="space-y-2">
              <div className="max-h-80 overflow-y-auto space-y-2 p-3 rounded-lg bg-muted/20 border border-border">
                {transcript.filter(e => e.isFinal).map((entry) => (
                  <div key={entry.id} className="text-sm flex gap-2">
                    <span className={`font-medium shrink-0 ${entry.speaker === "local" ? "text-primary" : "text-foreground"}`}>
                      {entry.speakerLabel}:
                    </span>
                    <span className="text-muted-foreground">{entry.text}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{transcript.filter(e => e.isFinal).length} segmentos</p>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Version history panel */}
      {showHistory && currentVersions.length > 0 && (
        <Card className="p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <History className="h-4 w-4" /> Histórico de versões
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>Fechar</Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {currentVersions.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-background border border-border">
                <div>
                  <p className="text-xs font-medium">{v.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(v.timestamp), "HH:mm:ss")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => restoreVersion(activeTab === "standard" ? "standard" : "structured", v)}
                  className="gap-1 text-xs"
                >
                  <RotateCcw className="h-3 w-3" /> Restaurar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Save actions */}
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
