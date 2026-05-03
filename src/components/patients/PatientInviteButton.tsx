import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Loader2, CheckCircle2, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Props {
  patientId: string;
  patientEmail: string | null;
  portalActive: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function PatientInviteButton({
  patientId,
  patientEmail,
  portalActive,
  variant = "default",
  size = "sm",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (portalActive) {
    return (
      <Button variant="outline" size={size} className={className} disabled>
        <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
        Portal ativo
      </Button>
    );
  }

  const handleInvite = async () => {
    if (!patientEmail) {
      toast.error("Cadastre um e-mail no paciente antes de enviar o convite.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-patient", {
        body: { patient_id: patientId },
      });
      if (error) throw error;
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);
      setInviteUrl(payload.invite_url);
      setOpen(true);
      toast.success("Convite criado!", {
        description: `E-mail enviado para ${patientEmail}. Válido por 7 dias.`,
      });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar convite");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Link copiado!");
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleInvite}
        disabled={loading || !patientEmail}
        className={className}
        title={!patientEmail ? "Cadastre um e-mail no paciente" : "Convidar para o portal"}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4 mr-2" />
        )}
        {loading ? "Enviando..." : "Convidar para o portal"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convite enviado</DialogTitle>
            <DialogDescription>
              Enviamos um e-mail para <strong>{patientEmail}</strong> com o link de
              ativação. Caso ele não chegue (verifique também o spam), você pode
              copiar o link abaixo e enviar manualmente. Validade: 7 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={inviteUrl ?? ""} readOnly className="font-mono text-xs" />
            <Button onClick={copy} variant="secondary">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
