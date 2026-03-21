import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

interface SystemStatusBarProps {
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncedAt?: Date | null;
}

const statusConfig: Record<SyncStatus, { icon: React.ElementType; label: string; className: string }> = {
  synced: {
    icon: CheckCircle2,
    label: "Online — tudo sincronizado",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  syncing: {
    icon: RefreshCw,
    label: "Sincronizando alterações...",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  offline: {
    icon: WifiOff,
    label: "Offline — trabalhando localmente",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  error: {
    icon: AlertTriangle,
    label: "Erro de sincronização",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function SystemStatusBar({ isOnline, syncStatus, pendingCount, lastSyncedAt }: SystemStatusBarProps) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[syncStatus];
  const Icon = config.icon;

  // Only show the bar when there's something relevant (offline, syncing, error, or pending items)
  const shouldShow = syncStatus !== "synced" || pendingCount > 0;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              "flex items-center justify-between px-4 py-2 text-xs font-medium border-b transition-colors cursor-pointer select-none",
              config.className
            )}
            onClick={() => pendingCount > 0 && setExpanded(!expanded)}
          >
            <div className="flex items-center gap-2">
              <Icon
                className={cn("w-3.5 h-3.5", syncStatus === "syncing" && "animate-spin")}
              />
              <span>{config.label}</span>
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {lastSyncedAt && syncStatus === "synced" && (
                <span className="text-muted-foreground text-[10px]">
                  Último sync: {lastSyncedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              {!isOnline && (
                <WifiOff className="w-3 h-3 text-muted-foreground" />
              )}
              {pendingCount > 0 && (
                expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              )}
            </div>
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {expanded && pendingCount > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={cn("overflow-hidden border-b text-xs px-4 py-2", config.className)}
              >
                <p className="text-muted-foreground">
                  📤 {pendingCount} alteração{pendingCount > 1 ? "ões" : ""} será{pendingCount > 1 ? "ão" : ""} sincronizada{pendingCount > 1 ? "s" : ""} automaticamente quando a conexão for restaurada.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
