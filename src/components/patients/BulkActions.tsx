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
import { Trash2, Download, FileSpreadsheet, FileText, File, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onClearSelection: () => void;
}

export function BulkActions({
  selectedCount,
  totalCount,
  onDelete,
  onExportCSV,
  onExportExcel,
  onExportPDF,
  onClearSelection,
}: BulkActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-2xl rounded-xl px-6 py-3 flex items-center gap-4"
      >
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
      </motion.div>
    </AnimatePresence>
  );
}
