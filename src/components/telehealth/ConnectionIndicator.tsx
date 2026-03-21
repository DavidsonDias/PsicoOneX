import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "unstable" | "reconnecting";

const statusConfig: Record<ConnectionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Wifi }> = {
  disconnected: { label: "Desconectado", variant: "destructive", icon: WifiOff },
  connecting: { label: "Conectando...", variant: "secondary", icon: Loader2 },
  connected: { label: "Conectado", variant: "default", icon: Wifi },
  unstable: { label: "Instável", variant: "outline", icon: Wifi },
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
