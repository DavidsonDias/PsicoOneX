import { useState, useCallback, useRef, memo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Lightbulb, Edit3, Sparkles, Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "./VoiceRecorder";
import { AIRefinementModal } from "./AIRefinementModal";

interface FreeFormEditorProps {
  value: string;
  onChange: (value: string) => void;
  structuredFields?: {
    complaints: string;
    observations: string;
    techniques_used: string;
    evolution: string;
    next_steps: string;
  };
  onStructuredChange?: (field: string, value: string) => void;
  className?: string;
}

const suggestions = [
  "Descreva o estado emocional do paciente",
  "Registre técnicas aplicadas",
  "Anote próximos passos",
  "Documente evolução observada",
];

const StructuredField = memo(({ label, value, placeholder, field, onChange }: {
  label: string; value: string; placeholder: string; field: string;
  onChange: (field: string, value: string) => void;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(field, e.target.value);
  }, [field, onChange]);

  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Textarea value={value} onChange={handleChange} placeholder={placeholder} rows={2} className="text-sm" />
    </div>
  );
});
StructuredField.displayName = "StructuredField";

const MainTextarea = memo(({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      placeholder="Escreva livremente suas anotações sobre a sessão. Você tem total liberdade para registrar da forma que preferir..."
      rows={8}
      className="min-h-[200px] resize-y text-base leading-relaxed"
    />
  );
});
MainTextarea.displayName = "MainTextarea";

export const FreeFormEditor = memo(function FreeFormEditor({
  value, onChange, structuredFields, onStructuredChange, className,
}: FreeFormEditorProps) {
  const [showStructured, setShowStructured] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [refinementModal, setRefinementModal] = useState<{
    open: boolean; original: string; refined: string; mode: "refine" | "organize";
  }>({ open: false, original: "", refined: "", mode: "refine" });
  const [undoStack, setUndoStack] = useState<string[]>([]);

  const insertSuggestion = useCallback((text: string) => {
    onChange(value ? `${value}\n\n${text}: ` : `${text}: `);
  }, [value, onChange]);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    const newValue = value ? `${value} ${transcript}` : transcript;
    setUndoStack(prev => [...prev, value]);
    onChange(newValue);
  }, [value, onChange]);

  const handleAIAction = useCallback(async (mode: "refine" | "organize") => {
    if (!value?.trim()) {
      toast.error("Escreva ou dite algo antes de usar a IA.");
      return;
    }

    const setter = mode === "refine" ? setIsRefining : setIsOrganizing;
    setter(true);

    try {
      const { data, error } = await supabase.functions.invoke("refine-record", {
        body: { text: value, mode },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRefinementModal({
        open: true,
        original: value,
        refined: data.refined || "",
        mode,
      });
    } catch (err: any) {
      console.error("AI error:", err);
      toast.error(err.message || "Erro ao processar com IA");
    } finally {
      setter(false);
    }
  }, [value]);

  const handleReplace = useCallback(() => {
    setUndoStack(prev => [...prev, value]);
    onChange(refinementModal.refined);
    setRefinementModal(prev => ({ ...prev, open: false }));
    toast.success("Texto substituído!");
  }, [value, refinementModal.refined, onChange]);

  const handleMerge = useCallback(() => {
    setUndoStack(prev => [...prev, value]);
    onChange(`${value}\n\n--- Versão Refinada ---\n\n${refinementModal.refined}`);
    setRefinementModal(prev => ({ ...prev, open: false }));
    toast.success("Textos mesclados!");
  }, [value, refinementModal.refined, onChange]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    onChange(previous);
    toast.info("Ação desfeita");
  }, [undoStack, onChange]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-primary" />
            Anotações da Sessão
            <Badge variant="outline" className="text-xs font-normal">Campo livre</Badge>
          </Label>

          <div className="flex items-center gap-2 flex-wrap">
            {undoStack.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={handleUndo} className="text-xs h-7">
                Desfazer
              </Button>
            )}
            <VoiceRecorder onTranscript={handleVoiceTranscript} />
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => handleAIAction("refine")}
              disabled={isRefining || !value?.trim()}
              className="gap-2"
            >
              {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="hidden sm:inline">Refinar com IA</span>
            </Button>
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => handleAIAction("organize")}
              disabled={isOrganizing || !value?.trim()}
              className="gap-2"
            >
              {isOrganizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              <span className="hidden sm:inline">Organizar</span>
            </Button>
          </div>
        </div>

        <MainTextarea value={value} onChange={onChange} />

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            Sugestões:
          </span>
          {suggestions.map((suggestion) => (
            <Button key={suggestion} type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={() => insertSuggestion(suggestion)}>
              + {suggestion}
            </Button>
          ))}
        </div>
      </div>

      {structuredFields && onStructuredChange && (
        <Collapsible open={showStructured} onOpenChange={setShowStructured}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2">Campos estruturados (opcional)</span>
              {showStructured ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              💡 Estes campos são totalmente opcionais. Use-os apenas se preferir organizar suas anotações de forma estruturada.
            </p>
            <StructuredField label="Queixas Apresentadas" value={structuredFields.complaints} placeholder="Opcional: motivo da consulta e queixas do paciente" field="complaints" onChange={onStructuredChange} />
            <StructuredField label="Observações Clínicas" value={structuredFields.observations} placeholder="Opcional: estado emocional, comportamento, relatos relevantes" field="observations" onChange={onStructuredChange} />
            <StructuredField label="Técnicas Utilizadas" value={structuredFields.techniques_used} placeholder="Opcional: técnicas aplicadas, exercícios propostos" field="techniques_used" onChange={onStructuredChange} />
            <StructuredField label="Evolução do Tratamento" value={structuredFields.evolution} placeholder="Opcional: progressos observados e mudanças no quadro" field="evolution" onChange={onStructuredChange} />
            <StructuredField label="Próximos Passos" value={structuredFields.next_steps} placeholder="Opcional: plano para as próximas sessões" field="next_steps" onChange={onStructuredChange} />
          </CollapsibleContent>
        </Collapsible>
      )}

      <AIRefinementModal
        open={refinementModal.open}
        onOpenChange={(open) => setRefinementModal(prev => ({ ...prev, open }))}
        originalText={refinementModal.original}
        refinedText={refinementModal.refined}
        mode={refinementModal.mode}
        onReplace={handleReplace}
        onMerge={handleMerge}
      />
    </div>
  );
});
