import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, XCircle, Sparkles } from "lucide-react";
import { ConsistencyIssue } from "@/hooks/useConsistencyCheck";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  issues: ConsistencyIssue[];
  onConfirm: () => void;
  onApplyFix?: (issue: ConsistencyIssue) => void;
  confirmLabel?: string;
}

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};
const COLORS = {
  info: "text-blue-500",
  warning: "text-amber-500",
  error: "text-destructive",
};

export function ConsistencyDialog({ open, onOpenChange, issues, onConfirm, onApplyFix, confirmLabel = "Continuar mesmo assim" }: Props) {
  const hasError = issues.some((i) => i.severity === "error");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Validação inteligente detectou pontos de atenção
          </DialogTitle>
          <DialogDescription>Revise antes de salvar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {issues.map((i, idx) => {
            const Icon = ICONS[i.severity];
            return (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${COLORS[i.severity]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{i.message}</p>
                  {i.suggestion && onApplyFix && i.suggested_value !== undefined && (
                    <Button variant="link" size="sm" className="h-auto p-0 mt-1" onClick={() => onApplyFix(i)}>
                      {i.suggestion}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Revisar</Button>
          <Button onClick={onConfirm} disabled={hasError} variant={hasError ? "destructive" : "default"}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
