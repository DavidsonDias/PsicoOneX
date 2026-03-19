import { CheckCircle2, Loader2, AlertTriangle, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutosaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  className?: string;
}

export function AutosaveIndicator({ status, className }: AutosaveIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs transition-opacity", className)}>
      {status === "idle" && (
        <>
          <Cloud className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Rascunho</span>
        </>
      )}
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-primary">Salvando...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">Salvo automaticamente</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle className="h-3 w-3 text-red-500" />
          <span className="text-red-600 dark:text-red-400">Erro ao salvar</span>
        </>
      )}
    </div>
  );
}
