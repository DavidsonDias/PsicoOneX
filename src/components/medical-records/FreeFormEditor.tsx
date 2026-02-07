import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Lightbulb, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function FreeFormEditor({
  value,
  onChange,
  structuredFields,
  onStructuredChange,
  className,
}: FreeFormEditorProps) {
  const [showStructured, setShowStructured] = useState(false);

  const suggestions = [
    "Descreva o estado emocional do paciente",
    "Registre técnicas aplicadas",
    "Anote próximos passos",
    "Documente evolução observada",
  ];

  const insertSuggestion = (text: string) => {
    const newValue = value ? `${value}\n\n${text}: ` : `${text}: `;
    onChange(newValue);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Free-Form Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-primary" />
            Anotações da Sessão
            <Badge variant="outline" className="text-xs font-normal">
              Campo livre
            </Badge>
          </Label>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escreva livremente suas anotações sobre a sessão. Você tem total liberdade para registrar da forma que preferir..."
          rows={8}
          className="min-h-[200px] resize-y text-base leading-relaxed"
        />
        
        {/* Quick Suggestions */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            Sugestões:
          </span>
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={() => insertSuggestion(suggestion)}
            >
              + {suggestion}
            </Button>
          ))}
        </div>
      </div>

      {/* Optional Structured Fields */}
      {structuredFields && onStructuredChange && (
        <Collapsible open={showStructured} onOpenChange={setShowStructured}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                Campos estruturados (opcional)
              </span>
              {showStructured ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              💡 Estes campos são totalmente opcionais. Use-os apenas se preferir organizar suas anotações de forma estruturada.
            </p>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Queixas Apresentadas</Label>
              <Textarea
                value={structuredFields.complaints}
                onChange={(e) => onStructuredChange("complaints", e.target.value)}
                placeholder="Opcional: motivo da consulta e queixas do paciente"
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Observações Clínicas</Label>
              <Textarea
                value={structuredFields.observations}
                onChange={(e) => onStructuredChange("observations", e.target.value)}
                placeholder="Opcional: estado emocional, comportamento, relatos relevantes"
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Técnicas Utilizadas</Label>
              <Textarea
                value={structuredFields.techniques_used}
                onChange={(e) => onStructuredChange("techniques_used", e.target.value)}
                placeholder="Opcional: técnicas aplicadas, exercícios propostos"
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Evolução do Tratamento</Label>
              <Textarea
                value={structuredFields.evolution}
                onChange={(e) => onStructuredChange("evolution", e.target.value)}
                placeholder="Opcional: progressos observados e mudanças no quadro"
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Próximos Passos</Label>
              <Textarea
                value={structuredFields.next_steps}
                onChange={(e) => onStructuredChange("next_steps", e.target.value)}
                placeholder="Opcional: plano para as próximas sessões"
                rows={2}
                className="text-sm"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
