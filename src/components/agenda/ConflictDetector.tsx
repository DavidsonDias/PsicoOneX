import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conflict {
  id: string;
  existingTime: Date;
  newTime: Date;
  patientName: string;
  type: "overlap" | "adjacent" | "double-booking";
}

interface ConflictDetectorProps {
  conflicts: Conflict[];
  onDismiss: (id: string) => void;
  onResolve: (id: string, action: "keep" | "replace" | "adjust") => void;
}

const conflictLabels = {
  overlap: { label: "Sobreposição", color: "destructive" },
  adjacent: { label: "Muito próximo", color: "warning" },
  "double-booking": { label: "Duplicado", color: "destructive" },
};

export function ConflictDetector({ conflicts, onDismiss, onResolve }: ConflictDetectorProps) {
  if (conflicts.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50 w-96 space-y-2"
      >
        {conflicts.map((conflict) => (
          <motion.div
            key={conflict.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card border border-destructive/50 rounded-xl p-4 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Conflito Detectado</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onDismiss(conflict.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <Badge variant="destructive" className="text-xs mb-2">
                  {conflictLabels[conflict.type].label}
                </Badge>
                
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span>{conflict.patientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(conflict.existingTime, "HH:mm", { locale: ptBR })} já agendado
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => onResolve(conflict.id, "keep")}
                  >
                    Manter Atual
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => onResolve(conflict.id, "adjust")}
                  >
                    Ajustar Horário
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
