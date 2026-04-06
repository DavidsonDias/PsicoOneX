import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Plus, Clock, X } from "lucide-react";
import { toast } from "sonner";

export interface SessionMarker {
  id: string;
  timestamp: number; // seconds since session start
  label: string;
  createdAt: Date;
}

interface SessionMarkersProps {
  sessionStartTime: Date | null;
  markers: SessionMarker[];
  onAddMarker: (marker: SessionMarker) => void;
  onRemoveMarker: (id: string) => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SessionMarkers({ sessionStartTime, markers, onAddMarker, onRemoveMarker }: SessionMarkersProps) {
  const [label, setLabel] = useState("");
  const [showInput, setShowInput] = useState(false);

  const handleAdd = useCallback(() => {
    if (!sessionStartTime) {
      toast.error("Sessão não iniciada");
      return;
    }

    const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
    const markerLabel = label.trim() || "Momento importante";

    onAddMarker({
      id: `marker-${Date.now()}`,
      timestamp: elapsed,
      label: markerLabel,
      createdAt: new Date(),
    });

    setLabel("");
    setShowInput(false);
    toast.success("Marcador adicionado!");
  }, [sessionStartTime, label, onAddMarker]);

  return (
    <Card className="bg-background/50">
      <CardHeader className="pb-2 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5 text-primary" />
            Marcadores ({markers.length})
          </CardTitle>
          {!showInput ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setShowInput(true)}
            >
              <Plus className="h-3 w-3" />
              Marcar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowInput(false)}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {showInput && (
          <div className="flex gap-1.5">
            <Input
              placeholder="Descrição (opcional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8 px-3 text-xs" onClick={handleAdd}>
              <Bookmark className="h-3 w-3" />
            </Button>
          </div>
        )}

        {markers.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-1">
            Nenhum marcador ainda
          </p>
        ) : (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {markers.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-muted/50 text-xs group">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    {formatTime(m.timestamp)}
                  </Badge>
                  <span className="truncate">{m.label}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={() => onRemoveMarker(m.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
