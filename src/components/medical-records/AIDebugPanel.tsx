import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bug, ChevronDown, ChevronUp, Copy, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export interface AIDebugEntry {
  id: string;
  timestamp: Date;
  type: "generate" | "refine" | "search" | "profile";
  input: string;
  systemPrompt?: string;
  output: string;
  model: string;
  durationMs?: number;
}

interface AIDebugPanelProps {
  entries: AIDebugEntry[];
}

export function AIDebugPanel({ entries }: AIDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (entries.length === 0) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const typeLabels = {
    generate: "Geração",
    refine: "Refinamento",
    search: "Busca",
    profile: "Perfil Clínico",
  };

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="pb-2 py-3 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
            <Bug className="h-3.5 w-3.5" />
            Modo Insight / Debug IA
            <Badge variant="outline" className="text-[10px]">{entries.length}</Badge>
          </CardTitle>
          {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0">
          <ScrollArea className="max-h-80">
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {typeLabels[entry.type]}
                      </Badge>
                      <span className="text-muted-foreground">{entry.model}</span>
                      {entry.durationMs && (
                        <span className="text-muted-foreground">{entry.durationMs}ms</span>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {entry.timestamp.toLocaleTimeString("pt-BR")}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] gap-1 w-full justify-start"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    {expandedId === entry.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {expandedId === entry.id ? "Ocultar detalhes" : "Ver detalhes"}
                  </Button>

                  {expandedId === entry.id && (
                    <div className="space-y-2">
                      {entry.systemPrompt && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-muted-foreground">System Prompt</span>
                            <Button variant="ghost" size="sm" className="h-5 px-1.5" onClick={() => handleCopy(entry.systemPrompt!, `sys-${entry.id}`)}>
                              {copiedId === `sys-${entry.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                          <pre className="bg-muted rounded p-2 whitespace-pre-wrap text-[10px] max-h-24 overflow-y-auto">
                            {entry.systemPrompt}
                          </pre>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-muted-foreground">Input (Prompt do Usuário)</span>
                          <Button variant="ghost" size="sm" className="h-5 px-1.5" onClick={() => handleCopy(entry.input, `in-${entry.id}`)}>
                            {copiedId === `in-${entry.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <pre className="bg-muted rounded p-2 whitespace-pre-wrap text-[10px] max-h-24 overflow-y-auto">
                          {entry.input}
                        </pre>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-muted-foreground">Output (Resposta da IA)</span>
                          <Button variant="ghost" size="sm" className="h-5 px-1.5" onClick={() => handleCopy(entry.output, `out-${entry.id}`)}>
                            {copiedId === `out-${entry.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <pre className="bg-muted rounded p-2 whitespace-pre-wrap text-[10px] max-h-24 overflow-y-auto">
                          {entry.output}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
