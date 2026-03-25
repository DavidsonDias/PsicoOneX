import { memo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Trash2, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface SessionActionsProps {
  sessionId: string;
  status: string;
  onUpdate: () => void;
}

export const SessionActions = memo(function SessionActions({ sessionId, status, onUpdate }: SessionActionsProps) {
  const [confirmAction, setConfirmAction] = useState<"delete" | "end" | null>(null);

  const endSession = async () => {
    const { error } = await supabase
      .from("telehealth_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() } as any)
      .eq("id", sessionId);
    if (error) toast.error("Erro ao encerrar sessão");
    else { toast.success("Sessão encerrada"); onUpdate(); }
    setConfirmAction(null);
  };

  const deleteSession = async () => {
    const { error } = await supabase
      .from("telehealth_sessions")
      .delete()
      .eq("id", sessionId);
    if (error) toast.error("Erro ao excluir sessão");
    else { toast.success("Sessão excluída"); onUpdate(); }
    setConfirmAction(null);
  };

  const reopenSession = async () => {
    const { error } = await supabase
      .from("telehealth_sessions")
      .update({ status: "waiting", ended_at: null } as any)
      .eq("id", sessionId);
    if (error) toast.error("Erro ao reabrir sessão");
    else { toast.success("Sessão reaberta"); onUpdate(); }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === "active" && (
            <DropdownMenuItem onClick={() => setConfirmAction("end")} className="text-destructive">
              <XCircle className="h-3.5 w-3.5 mr-2" />
              Encerrar sessão
            </DropdownMenuItem>
          )}
          {status === "ended" && (
            <DropdownMenuItem onClick={reopenSession}>
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
              Reabrir sessão
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setConfirmAction("delete")} className="text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Excluir sessão
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "delete" ? "Excluir sessão?" : "Encerrar sessão?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "delete"
                ? "Esta ação não pode ser desfeita. A sessão e seus dados serão removidos permanentemente."
                : "A sessão será marcada como finalizada e não poderá mais receber conexões."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction === "delete" ? deleteSession : endSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirmAction === "delete" ? "Excluir" : "Encerrar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
