import { useEffect, useState } from "react";
import { History, RotateCcw, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRecordVersions, RecordVersion } from "@/hooks/useRecordVersions";

interface VersionHistoryProps {
  recordId: string;
  trigger?: React.ReactNode;
  onRestored?: () => void;
}

export function VersionHistory({ recordId, trigger, onRestored }: VersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<RecordVersion | null>(null);
  const { versions, loading, listVersions, restoreVersion } = useRecordVersions();

  useEffect(() => {
    if (open) listVersions(recordId);
  }, [open, recordId, listVersions]);

  const handleRestore = async (v: RecordVersion) => {
    const ok = await restoreVersion(v);
    if (ok) {
      setOpen(false);
      onRestored?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            Histórico de versões
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Histórico de versões
          </DialogTitle>
          <DialogDescription>
            Cada salvamento gera uma versão. Restaure qualquer ponto sem perder os anteriores.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* List */}
          <ScrollArea className="border rounded-lg p-2 max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma versão arquivada ainda.
              </p>
            ) : (
              <div className="space-y-1">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelected(v)}
                    className={`w-full text-left p-3 rounded-md transition border ${
                      selected?.id === v.id
                        ? "bg-primary/5 border-primary/30"
                        : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">v{v.version_number}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(v.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {v.change_reason && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {v.change_reason}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Preview */}
          <div className="border rounded-lg p-4 flex flex-col min-h-0">
            {selected ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Pré-visualização v{selected.version_number}</span>
                  </div>
                  <Button size="sm" onClick={() => handleRestore(selected)} className="gap-2">
                    <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                  </Button>
                </div>
                <Separator className="mb-3" />
                <ScrollArea className="flex-1 max-h-[50vh] pr-3">
                  <VersionContent content={selected.content} />
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Selecione uma versão para pré-visualizar
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VersionContent({ content }: { content: any }) {
  const fields: Array<[string, string]> = [
    ["Queixas", "complaints"],
    ["Observações", "observations"],
    ["Técnicas", "techniques_used"],
    ["Evolução", "evolution"],
    ["Próximos passos", "next_steps"],
  ];
  return (
    <div className="space-y-3 text-sm">
      {fields.map(([label, key]) => {
        const val = content?.[key];
        if (!val) return null;
        return (
          <div key={key}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="whitespace-pre-wrap text-foreground/90 mt-1">{val}</p>
          </div>
        );
      })}
    </div>
  );
}
