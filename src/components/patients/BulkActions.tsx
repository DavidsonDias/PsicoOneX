import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2, Download, FileSpreadsheet, FileText, File, ChevronDown, X, UserX, Archive, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LIFECYCLE_STATUSES, type LifecycleStatus } from "@/lib/patient-lifecycle";

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  onInactivate?: () => void;
  /** Alteração de ciclo de vida em massa (fonte única de verdade do status). */
  onChangeLifecycle?: (status: LifecycleStatus) => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onClearSelection: () => void;
}

export function BulkActions({
  selectedCount,
  totalCount,
  onDelete,
  onInactivate,
  onChangeLifecycle,
  onExportCSV,
  onExportExcel,
  onExportPDF,
  onClearSelection,
}: BulkActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inactivateDialogOpen, setInactivateDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LifecycleStatus | null>(null);

  const statusMenu = onChangeLifecycle && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 w-full sm:w-auto min-h-[48px] sm:min-h-0 text-xs sm:text-sm">
          <RefreshCcw className="h-4 w-4 shrink-0" />
          Status
          <ChevronDown className="h-3 w-3 hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {LIFECYCLE_STATUSES.map((st) => (
          <DropdownMenuItem
            key={st.value}
            className="gap-2 cursor-pointer"
            onClick={() => setPendingStatus(st.value)}
          >
            {st.value === "archived" ? (
              <Archive className="h-4 w-4 shrink-0" />
            ) : (
              <span className={`h-2 w-2 rounded-full shrink-0 ${st.dot}`} />
            )}
            <span className="truncate">{st.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl"
      >
        <div className="bg-card border border-border shadow-2xl rounded-xl p-4 sm:px-6 sm:py-3">
          {/* Mobile layout */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {selectedCount} de {totalCount} selecionado(s)
              </Badge>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClearSelection}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 w-full min-h-[48px] text-xs">
                    <Download className="h-4 w-4 shrink-0" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={onExportCSV} className="gap-2 cursor-pointer">
                    <File className="h-4 w-4" />CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onExportExcel} className="gap-2 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4" />Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onExportPDF} className="gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {statusMenu || (onInactivate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 w-full min-h-[48px] text-xs border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  onClick={() => setInactivateDialogOpen(true)}
                >
                  <UserX className="h-4 w-4 shrink-0" />
                  Inativar
                </Button>
              ))}

              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 w-full min-h-[48px] text-xs"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Excluir
              </Button>
            </div>
          </div>

          {/* Desktop layout */}
          <div className="hidden sm:flex items-center gap-4">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {selectedCount} de {totalCount} selecionado(s)
            </Badge>
            <div className="h-6 w-px bg-border" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={onExportCSV} className="gap-2 cursor-pointer">
                  <File className="h-4 w-4" />CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportExcel} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportPDF} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {statusMenu}

            {onInactivate && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                onClick={() => setInactivateDialogOpen(true)}
              >
                <UserX className="h-4 w-4" />
                Inativar
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>⚠️ Excluir {selectedCount} paciente(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {selectedCount} paciente(s) selecionado(s)?
                Os registros serão enviados para a lixeira e poderão ser restaurados pelo administrador.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { onDelete(); setDeleteDialogOpen(false); }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir {selectedCount} paciente(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={inactivateDialogOpen} onOpenChange={setInactivateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Inativar {selectedCount} paciente(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                Os pacientes serão marcados como inativos. Prontuários e dados financeiros serão mantidos.
                Você pode reativá-los a qualquer momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { onInactivate?.(); setInactivateDialogOpen(false); }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Inativar {selectedCount} paciente(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!pendingStatus} onOpenChange={(o) => !o && setPendingStatus(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Alterar status de {selectedCount} paciente(s)?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Os pacientes selecionados passarão para{" "}
                <b>{LIFECYCLE_STATUSES.find((s) => s.value === pendingStatus)?.label}</b>. O histórico,
                prontuários e lançamentos financeiros são sempre preservados e a mudança fica registrada
                na auditoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingStatus) onChangeLifecycle?.(pendingStatus);
                  setPendingStatus(null);
                }}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </AnimatePresence>
  );
}
