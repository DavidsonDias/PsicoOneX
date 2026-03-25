import { memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bug, X } from "lucide-react";
import type { DebugInfo } from "@/hooks/useTelehealthWebRTC";

interface DebugOverlayProps {
  debug: DebugInfo;
}

export const DebugOverlay = memo(function DebugOverlay({ debug }: DebugOverlayProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-40 hover:opacity-100"
        onClick={() => setOpen(true)}
        title="Debug"
      >
        <Bug className="h-3.5 w-3.5" />
      </Button>
    );
  }

  const iceColor = (s: string) => {
    if (s === "connected" || s === "completed") return "default";
    if (s === "checking" || s === "new") return "secondary";
    return "destructive";
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg text-xs space-y-1.5 max-w-[260px]">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Debug</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setOpen(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <Row label="ICE" value={debug.iceState} badge={iceColor(debug.iceState)} />
      <Row label="Connection" value={debug.connectionState} badge={iceColor(debug.connectionState)} />
      <Row label="Signaling" value={debug.signalingState} />
      <Row label="Reconnects" value={String(debug.reconnectAttempts)} />
      <div className="border-t border-border pt-1.5 mt-1.5">
        <p className="text-[10px] text-muted-foreground truncate">📷 {debug.activeDevices.video}</p>
        <p className="text-[10px] text-muted-foreground truncate">🎤 {debug.activeDevices.audio}</p>
      </div>
    </div>
  );
});

function Row({ label, value, badge }: { label: string; value: string; badge?: "default" | "secondary" | "destructive" }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      {badge ? (
        <Badge variant={badge} className="text-[10px] h-4 px-1.5">{value}</Badge>
      ) : (
        <span className="font-mono">{value}</span>
      )}
    </div>
  );
}
