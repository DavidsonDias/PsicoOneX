import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePatientPortalAuth } from "@/contexts/PatientPortalAuthContext";
import { toast } from "sonner";

export default function PortalNotificationPreferences() {
  const { patient } = usePatientPortalAuth();
  const [channel, setChannel] = useState("email");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!patient) return;
    (async () => {
      const { data } = await supabase.from("patients")
        .select("preferred_notification_channel, whatsapp_phone, phone")
        .eq("id", patient.id).maybeSingle();
      if (data) {
        setChannel(data.preferred_notification_channel || "email");
        setPhone(data.whatsapp_phone || data.phone || "");
      }
      setLoading(false);
    })();
  }, [patient]);

  const save = async () => {
    if (!patient) return;
    setSaving(true);
    const { error } = await supabase.from("patients").update({
      preferred_notification_channel: channel,
      whatsapp_phone: phone || null,
    }).eq("id", patient.id);
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar");
    toast.success("Preferências salvas ✓");
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-600" /> Como prefere receber lembretes?
        </h2>
        <p className="text-xs text-muted-foreground">Você pode mudar a qualquer momento</p>
      </div>

      <RadioGroup value={channel} onValueChange={setChannel} className="space-y-2">
        {[
          { v: "email", l: "Apenas e-mail" },
          { v: "whatsapp", l: "Apenas WhatsApp" },
          { v: "both", l: "E-mail e WhatsApp" },
          { v: "none", l: "Não enviar lembretes" },
        ].map((o) => (
          <div key={o.v} className="flex items-center space-x-2 border rounded-md p-2.5 hover:bg-muted/50">
            <RadioGroupItem value={o.v} id={o.v} />
            <Label htmlFor={o.v} className="cursor-pointer flex-1">{o.l}</Label>
          </div>
        ))}
      </RadioGroup>

      {(channel === "whatsapp" || channel === "both") && (
        <div>
          <Label className="text-xs">Número WhatsApp (com DDI)</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" />
        </div>
      )}

      <Button onClick={save} disabled={saving} className="w-full">
        {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Salvar preferências
      </Button>
    </Card>
  );
}
