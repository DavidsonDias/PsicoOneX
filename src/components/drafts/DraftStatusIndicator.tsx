import { AlertTriangle, Check, CloudOff, CloudUpload, Loader2, Circle, Cloud } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DraftStatus } from "@/hooks/useDraftRecovery";

interface DraftStatusIndicatorProps {
  status: DraftStatus;
  isOnline?: boolean;
  lastLocalAt?: Date | null;
  lastSyncedAt?: Date | null;
  className?: string;
}

export function DraftStatusIndicator({
  status,
  isOnline = true,
  lastLocalAt,
  lastSyncedAt,
  className,
}: DraftStatusIndicatorProps) {
  const time = lastSyncedAt || lastLocalAt;
  const stamp = time ? ` · ${format(time, "HH:mm")}` : "";

  const map: Record<DraftStatus, { icon: JSX.Element; text: string; tone: string }> = {
    idle: {
      icon: <Cloud className="h-3 w-3" />,
      text: "Rascunho protegido",
      tone: "text-muted-foreground",
    },
    dirty: {
      icon: <Circle className="h-2.5 w-2.5 fill-current" />,
      text: "Alterações não salvas",
      tone: "text-amber-600 dark:text-amber-400",
    },
    saving: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: "Salvando...",
      tone: "text-primary",
    },
    local: {
      icon: isOnline ? <Check className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />,
      text: `Salvo neste dispositivo${stamp}`,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    synced: {
      icon: <CloudUpload className="h-3 w-3" />,
      text: `Sincronizado${stamp}`,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    sync_failed: {
      icon: <AlertTriangle className="h-3 w-3" />,
      text: "Falha na sincronização · salvo localmente",
      tone: "text-amber-600 dark:text-amber-400",
    },
    failed: {
      icon: <AlertTriangle className="h-3 w-3" />,
      text: "Não foi possível salvar o rascunho",
      tone: "text-destructive",
    },
  };

  const s = map[status];

  return (
    <div className={cn("flex items-center gap-1.5 text-xs transition-colors", s.tone, className)}>
      {s.icon}
      <span className="truncate">{s.text}</span>
    </div>
  );
}
