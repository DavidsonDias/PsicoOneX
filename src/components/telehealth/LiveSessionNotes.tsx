import { memo, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotebookPen, X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiveSessionNotesProps {
  sessionId: string;
  initialValue?: string | null;
  onClose?: () => void;
}

/**
 * Private real-time notes panel shown to the psychologist during a telehealth call.
 * Autosaves to telehealth_sessions.live_notes (debounced ~1.5s).
 * Only the host (psychologist) sees this — never sent to the patient.
 */
export const LiveSessionNotes = memo(function LiveSessionNotes({
  sessionId,
  initialValue,
  onClose,
}: LiveSessionNotesProps) {
  const [value, setValue] = useState(initialValue || "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!sessionId) return;
    if (value === (initialValue || "")) return;

    setState("saving");
    timerRef.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from("telehealth_sessions")
        .update({ live_notes: value } as any)
        .eq("id", sessionId);
      setState(error ? "error" : "saved");
      if (!error) {
        window.setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 1500);
      }
    }, 1500);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, sessionId]);

  return (
    <Card className="flex flex-col h-full border-primary/20">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Anotações privadas</h3>
          {state === "saving" && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Salvando
            </Badge>
          )}
          {state === "saved" && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Check className="h-2.5 w-2.5" /> Salvo
            </Badge>
          )}
          {state === "error" && (
            <Badge variant="destructive" className="text-[10px]">Erro</Badge>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Escreva observações durante a sessão. Somente você verá este conteúdo."
        className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 text-sm min-h-[260px]"
      />
      <p className="text-[10px] text-muted-foreground px-3 py-2 border-t">
        Visível apenas para você. Salvo automaticamente na sessão e disponível no resumo pós-atendimento.
      </p>
    </Card>
  );
});
