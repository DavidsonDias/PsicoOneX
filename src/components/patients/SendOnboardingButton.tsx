import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Send, Copy, Check, Loader2, MessageCircle, Mail } from "lucide-react";
import { createOnboardingLink, getOnboardingUrl, type OnboardingValidity } from "@/lib/patient-onboarding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  trigger?: React.ReactNode;
}

export function SendOnboardingButton({ patientId, patientName, patientPhone, patientEmail, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [validity, setValidity] = useState<OnboardingValidity>("72h");
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    const token = await createOnboardingLink({ patientId, psychologistId: user.id, validity });
    if (token) setUrl(getOnboardingUrl(token));
    else toast({ title: "Erro", description: "Não foi possível gerar o link", variant: "destructive" });
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const waMsg = encodeURIComponent(
    `Olá ${patientName}! Para que eu possa atendê-lo(a) melhor, complete seu cadastro neste link seguro: ${url}`
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setUrl(""); } }}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm" className="gap-2"><Send className="h-4 w-4" />Enviar cadastro</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar formulário de cadastro</DialogTitle>
        </DialogHeader>
        {!url ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Gere um link seguro temporário para <strong>{patientName}</strong> completar o próprio cadastro (dados pessoais, endereço, convênio, documentos e termo LGPD).
            </p>
            <div className="space-y-2">
              <Label>Validade do link</Label>
              <Select value={validity} onValueChange={(v) => setValidity(v as OnboardingValidity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 horas</SelectItem>
                  <SelectItem value="48h">48 horas</SelectItem>
                  <SelectItem value="72h">72 horas (recomendado)</SelectItem>
                  <SelectItem value="7d">7 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generate} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gerar link seguro
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <Label className="text-xs">Link gerado</Label>
              <div className="flex gap-2">
                <Input readOnly value={url} className="text-xs" />
                <Button size="icon" variant="outline" onClick={copy}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {patientPhone && (
                <Button asChild variant="outline" className="gap-2">
                  <a href={`https://wa.me/${patientPhone.replace(/\D/g, "")}?text=${waMsg}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              )}
              {patientEmail && (
                <Button asChild variant="outline" className="gap-2">
                  <a href={`mailto:${patientEmail}?subject=${encodeURIComponent("Complete seu cadastro")}&body=${waMsg}`}>
                    <Mail className="h-4 w-4" /> E-mail
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
