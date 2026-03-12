import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Sparkles } from "lucide-react";
import { useSubscriptionCenter } from "@/contexts/SubscriptionCenterContext";
import { useState, createContext, useContext, useCallback } from "react";

interface WriteBlockedContextType {
  showBlockedModal: () => void;
  guardWrite: (action: () => void) => void;
}

const WriteBlockedContext = createContext<WriteBlockedContextType>({
  showBlockedModal: () => {},
  guardWrite: (action) => action(),
});

export const useWriteGuard = () => useContext(WriteBlockedContext);

export function WriteBlockedProvider({ canWrite, children }: { canWrite: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { setOpen: setSubscriptionOpen } = useSubscriptionCenter();

  const showBlockedModal = useCallback(() => setOpen(true), []);

  const guardWrite = useCallback((action: () => void) => {
    if (!canWrite) {
      setOpen(true);
    } else {
      action();
    }
  }, [canWrite]);

  return (
    <WriteBlockedContext.Provider value={{ showBlockedModal, guardWrite }}>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="items-center text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">Seu plano expirou</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Seu período de teste ou assinatura terminou. Ative um plano para continuar utilizando o PsicoOne.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full gap-2" onClick={() => { setOpen(false); setSubscriptionOpen(true); }}>
              <Sparkles className="h-4 w-4" /> Ver Planos
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WriteBlockedContext.Provider>
  );
}
