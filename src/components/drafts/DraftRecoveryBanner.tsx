import { useState } from "react";
import { AlertCircle, GitCompare, RotateCcw, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { diffDrafts, type DraftSnapshot } from "@/lib/draft-engine";

interface DraftRecoveryBannerProps {
  draft: DraftSnapshot;
  /** Versão atualmente carregada no formulário (versão oficial). */
  savedData: any;
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryBanner({ draft, savedData, onRestore, onDiscard }: DraftRecoveryBannerProps) {
  const [diffOpen, setDiffOpen] = useState(false);
  const diff = diffDrafts(savedData, draft.payload);

  return (
    <>
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium">Encontramos alterações não finalizadas</p>
            <p className="text-xs text-muted-foreground">
              Última alteração:{" "}
              {format(new Date(draft.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              {draft.remote ? " · outro dispositivo" : " · este dispositivo"}
            </p>
            {diff.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {diff.length} campo(s) diferentes da versão salva
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onRestore} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar alterações
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setDiffOpen(true)} className="gap-1.5">
            <GitCompare className="h-3.5 w-3.5" />
            Ver diferenças
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDiscard} className="gap-1.5 text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
            Descartar
          </Button>
        </div>
      </div>

      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Versão salva vs. rascunho</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            {diff.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma diferença encontrada.</p>
            ) : (
              <div className="space-y-3">
                {diff.map((d, i) => (
                  <div key={`${d.field}-${i}`} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium capitalize">{d.field}</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {d.kind === "added" ? "adicionado" : d.kind === "removed" ? "removido" : "alterado"}
                      </Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      <div className="rounded bg-destructive/10 p-2">
                        <p className="text-muted-foreground mb-1">Versão salva</p>
                        <p className="whitespace-pre-wrap break-words">{d.before || "—"}</p>
                      </div>
                      <div className="rounded bg-emerald-500/10 p-2">
                        <p className="text-muted-foreground mb-1">Rascunho</p>
                        <p className="whitespace-pre-wrap break-words">{d.after || "—"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDiffOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                setDiffOpen(false);
                onRestore();
              }}
            >
              Restaurar rascunho
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
