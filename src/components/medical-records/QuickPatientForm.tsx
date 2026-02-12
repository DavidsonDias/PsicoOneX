import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickPatientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientCreated: (patient: { id: string; full_name: string }) => void;
}

export function QuickPatientForm({ open, onOpenChange, onPatientCreated }: QuickPatientFormProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const full_name = (formData.get("full_name") as string).trim();
    const email = (formData.get("email") as string)?.trim() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;

    if (!full_name) {
      toast.error("Nome é obrigatório");
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("patients")
        .insert({
          psychologist_id: session.user.id,
          full_name,
          email,
          phone,
        })
        .select("id, full_name")
        .single();

      if (error) throw error;

      toast.success("Paciente cadastrado!");
      onPatientCreated(data);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao cadastrar paciente");
    } finally {
      setLoading(false);
    }
  }, [onPatientCreated, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Cadastro Rápido
          </DialogTitle>
          <DialogDescription>
            Cadastre um paciente rapidamente sem sair do prontuário
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qp_full_name">Nome Completo *</Label>
            <Input id="qp_full_name" name="full_name" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qp_email">E-mail</Label>
            <Input id="qp_email" name="email" type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qp_phone">Telefone</Label>
            <Input id="qp_phone" name="phone" placeholder="(00) 00000-0000" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Cadastrar e Selecionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}