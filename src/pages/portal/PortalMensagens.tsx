import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePatientPortalAuth } from "@/contexts/PatientPortalAuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function PortalMensagens() {
  const { user, patient } = usePatientPortalAuth();
  const [loading, setLoading] = useState(true);
  const [appts, setAppts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!patient) return;
    (async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, scheduled_at, type")
        .eq("patient_id", patient.id)
        .is("deleted_at", null)
        .order("scheduled_at", { ascending: false })
        .limit(20);
      setAppts(data || []);
      if (data?.[0]) setSelected(data[0]);
      setLoading(false);
    })();
  }, [patient]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const { data } = await supabase
        .from("appointment_messages")
        .select("*")
        .eq("appointment_id", selected.id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    })();
  }, [selected]);

  const send = async () => {
    if (!text.trim() || !selected || !user) return;
    setSending(true);
    const { error } = await supabase.from("appointment_messages").insert({
      appointment_id: selected.id,
      sender_user_id: user.id,
      sender_role: "patient",
      message: text.trim(),
    });
    if (error) {
      setSending(false);
      return toast.error("Erro ao enviar");
    }
    setText("");
    const { data } = await supabase.from("appointment_messages").select("*").eq("appointment_id", selected.id).order("created_at", { ascending: true });
    setMessages(data || []);
    setSending(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mensagens</h1>
        <p className="text-sm text-muted-foreground">Converse com seu profissional sobre cada sessão</p>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <Card className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
          {appts.map(a => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className={`w-full text-left p-2 rounded-md text-xs hover:bg-muted ${selected?.id === a.id ? "bg-muted" : ""}`}
            >
              <div className="font-medium">{format(new Date(a.scheduled_at), "dd/MM HH:mm", { locale: ptBR })}</div>
              <div className="text-muted-foreground">{a.type === "online" ? "Online" : "Presencial"}</div>
            </button>
          ))}
          {appts.length === 0 && <p className="text-xs text-muted-foreground p-3">Nenhuma sessão</p>}
        </Card>

        <Card className="p-3 flex flex-col h-[60vh]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                Selecione uma sessão
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {messages.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Nenhuma mensagem ainda</p>}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_role === "patient" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_role === "patient" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {m.message}
                      <div className="text-[10px] opacity-70 mt-1">{format(new Date(m.created_at), "HH:mm")}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-3 border-t mt-2">
                <Textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  className="resize-none min-h-[40px]"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <Button onClick={send} disabled={!text.trim() || sending} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
