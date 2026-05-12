import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendWhatsApp } from "@/services/whatsapp.service";

interface Props {
  patientId?: string;
  defaultPhone?: string | null;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
}

export function WhatsAppButton({ patientId, defaultPhone, size = "sm", variant = "outline" }: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(defaultPhone || "");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!phone.trim() || !text.trim()) return toast.error("Telefone e mensagem são obrigatórios");
    setSending(true);
    try {
      await sendWhatsApp({ to: phone, patient_id: patientId, text });
      toast.success("WhatsApp enviado ✓");
      setOpen(false);
      setText("");
    } catch (e: any) {
      toast.error(e.message || "Falha ao enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        variant={variant} size={size}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="gap-1.5"
      >
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader><DialogTitle>Enviar WhatsApp</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Telefone (com DDI)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" />
            </div>
            <div>
              <Label className="text-xs">Mensagem</Label>
              <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite a mensagem..." />
              <p className="text-xs text-muted-foreground mt-1">
                Mensagens livres só podem ser enviadas dentro de 24h da última interação do paciente. Fora disso, use templates aprovados.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
