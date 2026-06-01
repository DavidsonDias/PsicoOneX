import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Loader2, Copy, Check, MessageCircle, Mail, ExternalLink, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  transactionId: string;
  existingUrl?: string | null;
  patientName?: string;
  patientPhone?: string | null;
  patientEmail?: string | null;
  amount: number;
  variant?: "icon" | "button";
}

export function PaymentLinkActions({
  transactionId, existingUrl, patientName, patientPhone, patientEmail, amount, variant = "icon",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(existingUrl || null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-patient-payment-link", {
        body: { transactionId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUrl(data.url);
      toast.success(data.reused ? "Link já existente carregado" : "Link de pagamento gerado");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar link");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const valueFmt = `R$ ${Number(amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const msg = encodeURIComponent(
    `Olá${patientName ? ` ${patientName}` : ""}! Segue o link para pagamento (${valueFmt}): ${url || ""}`
  );

  return (
    <>
      {variant === "icon" ? (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => { setOpen(true); if (existingUrl) setUrl(existingUrl); }}
          title={existingUrl ? "Ver link de pagamento" : "Gerar link de pagamento"}
          className={existingUrl ? "text-primary" : ""}
        >
          {existingUrl ? <Link2 className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
          <CreditCard className="h-4 w-4" /> Cobrar
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Cobrança via Stripe
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">Valor</p>
              <p className="text-xl font-bold">{valueFmt}</p>
              {patientName && <p className="text-xs text-muted-foreground mt-1">Paciente: {patientName}</p>}
            </div>

            {!url ? (
              <Button onClick={generate} disabled={loading} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Gerar link de pagamento
              </Button>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Link de pagamento</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={url} className="text-xs font-mono" />
                    <Button size="icon" variant="outline" onClick={copy}>
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Aceita cartão, PIX e boleto conforme configuração da sua conta Stripe.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button asChild variant="outline" size="sm" className="gap-1">
                    <a href={url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={!patientPhone}
                  >
                    <a
                      href={patientPhone ? `https://wa.me/${patientPhone.replace(/\D/g, "")}?text=${msg}` : "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={!patientEmail}
                  >
                    <a href={patientEmail ? `mailto:${patientEmail}?subject=${encodeURIComponent("Link de pagamento")}&body=${msg}` : "#"}>
                      <Mail className="h-3.5 w-3.5" /> E-mail
                    </a>
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
