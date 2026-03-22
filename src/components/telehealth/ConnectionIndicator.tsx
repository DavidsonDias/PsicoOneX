import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Loader2, AlertTriangle } from "lucide-react";
import type { ConnectionStatus } from "@/hooks/useTelehealthWebRTC";

const statusConfig: Record<ConnectionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Wifi }> = {
  disconnected: { label: "Desconectado", variant: "destructive", icon: WifiOff },
  connecting: { label: "Conectando...", variant: "secondary", icon: Loader2 },
  connected: { label: "Conectado", variant: "default", icon: Wifi },
  unstable: { label: "Instável", variant: "outline", icon: AlertTriangle },
  reconnecting: { label: "Reconectando...", variant: "secondary", icon: Loader2 },
};

export const ConnectionIndicator = memo(function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1.5">
      <Icon className={`h-3 w-3 ${status === "connecting" || status === "reconnecting" ? "animate-spin" : ""}`} />
      {config.label}
    </Badge>
  );
});
