import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Video, Calendar, Clock, MapPin, ShieldCheck, ShieldAlert,
  CheckCircle2, User, Loader2, Stethoscope, XCircle, RefreshCw, MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";

type PortalState = "loading" | "invalid" | "valid";

interface PortalData {
  link: { id: string; expires_at: string; used_at: string | null };
  appointment: {
    id: string;
    scheduled_at: string;
    duration_minutes: number | null;
    type: string | null;
    status: string | null;
    notes: string | null;
    meeting_status?: string | null;
    patient_confirmed_at?: string | null;
    patient_cancelled_at?: string | null;
  } | null;
  patient: { full_name: string; email: string | null; phone: string | null } | null;
  psychologist: { full_name: string; specialty: string | null; clinic_name: string | null } | null;
}

export default function PortalPacienteExterno() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<PortalState>("loading");
  const [data, setData] = useState<PortalData | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Dialogs
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

  // Form fields
  const [cancelReason, setCancelReason] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [proposedTime, setProposedTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    if (token) loadPortal(token);
  }, [token]);

  // Realtime: refresh portal when appointment changes
  useEffect(() => {
    if (!data?.appointment?.id) return;
    const channel = supabase
      .channel(`portal-apt-${data.appointment.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "appointments",
          filter: `id=eq.${data.appointment.id}`,
        },
        () => {
          if (token) loadPortal(token);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.appointment?.id, token]);

  const callPortalFn = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("patient-portal", { body });
    if (error) throw error;
    return data;
  };

  const loadPortal = async (t: string) => {
    try {
      const result = await callPortalFn({ token: t });
      if (result.error) {
        setErrorMsg(
          result.error === "Link expirado"
            ? "Este link expirou. Solicite um novo ao seu profissional."
            : result.error === "Link revogado"
            ? "Este link foi revogado pelo profissional."
            : "Link não encontrado ou inválido."
        );
        setState("invalid");
        return;
      }
      setData(result as PortalData);
      setState("valid");
    } catch {
      setErrorMsg("Erro ao carregar portal.");
      setState("invalid");
    }
  };

  const handleConfirmPresence = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await callPortalFn({ token, action: "confirm" });
      toast.success("Presença confirmada! Obrigado.");
      if (data?.appointment) {
        setData({ ...data, appointment: { ...data.appointment, status: "confirmed" } });
      }
    } catch {
      toast.error("Erro ao confirmar presença.");
    }
    setBusy(false);
  };

  const handleCancel = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await callPortalFn({ token, action: "cancel", reason: cancelReason });
      toast.success("Sessão cancelada. O profissional foi notificado.");
      setCancelOpen(false);
      setCancelReason("");
      if (data?.appointment) {
        setData({ ...data, appointment: { ...data.appointment, status: "cancelled" } });
      }
    } catch {
      toast.error("Erro ao cancelar sessão.");
    }
    setBusy(false);
  };

  const handleReschedule = async () => {
    if (!token) return;
    if (!proposedDate || !proposedTime) {
      toast.error("Escolha data e horário sugeridos");
      return;
    }
    const proposed = new Date(`${proposedDate}T${proposedTime}:00`).toISOString();
    setBusy(true);
    try {
      await callPortalFn({
        token,
        action: "reschedule",
        proposed_date: proposed,
        reason: rescheduleReason,
      });
      toast.success("Solicitação enviada! O profissional receberá sua proposta.");
      setRescheduleOpen(false);
      setProposedDate("");
      setProposedTime("");
      setRescheduleReason("");
    } catch {
      toast.error("Erro ao enviar solicitação.");
    }
    setBusy(false);
  };

  const handleSendMessage = async () => {
    if (!token || !messageText.trim()) return;
    setBusy(true);
    try {
      await callPortalFn({ token, action: "message", message: messageText });
      toast.success("Mensagem enviada ao profissional.");
      setMessageOpen(false);
      setMessageText("");
    } catch {
      toast.error("Erro ao enviar mensagem.");
    }
    setBusy(false);
  };

  const handleJoinSession = async () => {
    if (!token) return;
    try {
      const result = await callPortalFn({ token, action: "join" });
      if (result.waiting) {
        toast.info(result.message || "Aguardando o profissional iniciar a sessão.");
        return;
      }
      if (result.room_token) {
        navigate(`/sala/${result.room_token}`);
      } else {
        toast.error("A sala ainda não foi criada pelo profissional.");
      }
    } catch {
      toast.error("Erro ao entrar na sessão.");
    }
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-destructive/5 to-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="max-w-md w-full text-center p-8">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Acesso Indisponível</h1>
            <p className="text-muted-foreground">{errorMsg}</p>
            <Separator className="my-6" />
            <p className="text-xs text-muted-foreground">PsicoOne · Plataforma Clínica Inteligente</p>
          </Card>
        </motion.div>
      </div>
    );
  }

  const appointment = data?.appointment;
  const scheduled = appointment ? new Date(appointment.scheduled_at) : null;
  const isOnline = appointment?.type === "online";
  const isConfirmed = appointment?.status === "confirmed" || appointment?.status === "completed";
  const isCancelled = appointment?.status === "cancelled";
  const meetingLive = appointment?.meeting_status === "live";
  const canActOnSession = !isCancelled && appointment?.status !== "completed";

  // Status badge config
  const statusBadge = (() => {
    if (isCancelled) return { label: "Cancelada", cls: "bg-destructive/10 text-destructive border-destructive/30" };
    if (appointment?.status === "completed") return { label: "Realizada", cls: "bg-purple-500/10 text-purple-600 border-purple-500/30" };
    if (meetingLive) return { label: "Em atendimento", cls: "bg-green-500/10 text-green-600 border-green-500/30 animate-pulse" };
    if (isConfirmed) return { label: "Confirmada", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" };
    return { label: "Aguardando confirmação", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
  })();

  // Min date for reschedule = tomorrow
  const minDate = format(new Date(Date.now() + 24 * 3600 * 1000), "yyyy-MM-dd");

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-sm">PsicoOne</span>
          </div>
          <Badge variant="outline" className="gap-1 text-xs">
            <ShieldCheck className="h-3 w-3" />
            Sessão segura
          </Badge>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">
              Olá, {data?.patient?.full_name?.split(" ")[0] || "Paciente"}!
            </h1>
            <p className="text-muted-foreground mt-1">Aqui estão os detalhes da sua sessão</p>
          </div>

          {appointment && scheduled && (
            <Card className="border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Sua Sessão</h2>
                  <Badge variant="outline" className={statusBadge.cls}>
                    {statusBadge.label}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-medium">{format(scheduled, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Horário</p>
                      <p className="font-medium">{format(scheduled, "HH:mm")} · {appointment.duration_minutes || 50} minutos</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {isOnline ? <Video className="h-5 w-5 text-primary" /> : <MapPin className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Modalidade</p>
                      <p className="font-medium">{isOnline ? "Online (Videochamada)" : "Presencial"}</p>
                    </div>
                  </div>

                  {data?.psychologist && (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Stethoscope className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Profissional</p>
                        <p className="font-medium">{data.psychologist.full_name}</p>
                        {data.psychologist.specialty && (
                          <p className="text-xs text-muted-foreground">{data.psychologist.specialty}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Action buttons */}
                {canActOnSession && (
                  <div className="space-y-3">
                    {/* Online: join session button */}
                    {isOnline && (
                      <Button
                        onClick={handleJoinSession}
                        className={`w-full gap-2 ${meetingLive ? "bg-green-500 hover:bg-green-600 text-white" : ""}`}
                        size="lg"
                        disabled={!meetingLive && !isConfirmed}
                      >
                        <Video className="h-5 w-5" />
                        {meetingLive ? "🔴 Entrar na sessão (ao vivo)" : "Aguardando o profissional iniciar"}
                      </Button>
                    )}

                    {/* Confirm presence */}
                    {!isConfirmed && (
                      <Button
                        onClick={handleConfirmPresence}
                        variant={isOnline ? "outline" : "default"}
                        className="w-full gap-2"
                        size="lg"
                        disabled={busy}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                        Confirmar Presença
                      </Button>
                    )}

                    {/* Secondary actions */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setRescheduleOpen(true)}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span className="text-xs">Reagendar</span>
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setMessageOpen(true)}>
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="text-xs">Mensagem</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive hover:text-destructive"
                        onClick={() => setCancelOpen(true)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span className="text-xs">Cancelar</span>
                      </Button>
                    </div>
                  </div>
                )}

                {isCancelled && (
                  <div className="bg-destructive/5 rounded-lg p-4 text-center">
                    <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="font-medium text-sm">Sessão cancelada</p>
                    <p className="text-xs text-muted-foreground">Entre em contato com seu profissional para reagendar.</p>
                  </div>
                )}

                {isConfirmed && !isOnline && !isCancelled && (
                  <div className="bg-primary/5 rounded-lg p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="font-medium text-sm">Presença confirmada!</p>
                    <p className="text-xs text-muted-foreground">Aguardamos você no horário agendado.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isOnline && canActOnSession && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">📋 Instruções</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Verifique sua conexão com a internet</li>
                  <li>• Use fones de ouvido para melhor privacidade</li>
                  <li>• Escolha um ambiente tranquilo e silencioso</li>
                  <li>• Permita o acesso à câmera e microfone</li>
                  <li>• Entre na sala alguns minutos antes do horário</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>

      <footer className="border-t mt-12 py-6">
        <div className="max-w-lg mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">🔒 Ambiente seguro e criptografado · PsicoOne</p>
        </div>
      </footer>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar sessão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar? O profissional será notificado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: imprevisto pessoal, doença..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={busy}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar reagendamento</DialogTitle>
            <DialogDescription>
              Sugira uma nova data/horário. O profissional precisará aprovar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Nova data</Label>
                <Input
                  type="date"
                  min={minDate}
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Novo horário</Label>
                <Input
                  type="time"
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Ex: prefiro de manhã"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)} disabled={busy}>
              Voltar
            </Button>
            <Button onClick={handleReschedule} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar mensagem</DialogTitle>
            <DialogDescription>
              Sua mensagem será enviada diretamente ao profissional.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Escreva sua mensagem..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleSendMessage} disabled={busy || !messageText.trim()}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
