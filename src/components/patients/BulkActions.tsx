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
import { Trash2, Download, FileSpreadsheet, FileText, File, ChevronDown, X, UserX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  onInactivate?: () => void;
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
  onExportCSV,
  onExportExcel,
  onExportPDF,
  onClearSelection,
}: BulkActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inactivateDialogOpen, setInactivateDialogOpen] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl"
      >
        <div className="bg-card border border-border shadow-2xl rounded-xl p-3 sm:px-6 sm:py-3">
          {/* Mobile: stacked layout */}
          <div className="flex items-center justify-between mb-3 sm:mb-0 sm:hidden">
            <Badge variant="secondary" className="text-xs px-2 py-1">
              {selectedCount} de {totalCount}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Desktop badge + close */}
            <Badge variant="secondary" className="hidden sm:inline-flex text-sm px-3 py-1">
              {selectedCount} de {totalCount} selecionado(s)
            </Badge>
            <div className="hidden sm:block h-6 w-px bg-border" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none min-h-[44px] sm:min-h-0">
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

            {onInactivate && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 flex-1 sm:flex-none min-h-[44px] sm:min-h-0 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                onClick={() => setInactivateDialogOpen(true)}
              >
                <UserX className="h-4 w-4" />
                Inativar
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              className="gap-2 flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>

            <Button variant="ghost" size="icon" className="hidden sm:inline-flex h-8 w-8" onClick={onClearSelection}>
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
      </motion.div>
    </AnimatePresence>
  );
}
