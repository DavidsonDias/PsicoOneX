import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Video, Calendar, Clock, MapPin, ShieldCheck, ShieldAlert,
  CheckCircle2, RefreshCw, User, Loader2
} from "lucide-react";
import { motion } from "framer-motion";

type PortalState = "loading" | "invalid" | "valid";

interface LinkData {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  token: string;
  expires_at: string;
  used_at: string | null;
  is_revoked: boolean;
}

interface AppointmentData {
  id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  type: string | null;
  status: string | null;
  notes: string | null;
}

interface PatientData {
  full_name: string;
}

export default function PortalPacienteExterno() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<PortalState>("loading");
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (token) loadPortal(token);
  }, [token]);

  const loadPortal = async (t: string) => {
    try {
      // Fetch link data - use anon access
      const { data: link, error: linkErr } = await supabase
        .from("patient_access_links")
        .select("*")
        .eq("token", t)
        .single();

      if (linkErr || !link) {
        setErrorMsg("Link não encontrado ou inválido.");
        setState("invalid");
        return;
      }

      const typedLink = link as unknown as LinkData;

      if (typedLink.is_revoked) {
        setErrorMsg("Este link foi revogado pelo profissional.");
        setState("invalid");
        return;
      }

      if (new Date(typedLink.expires_at) < new Date()) {
        setErrorMsg("Este link expirou. Solicite um novo ao seu profissional.");
        setState("invalid");
        return;
      }

      setLinkData(typedLink);

      // Fetch appointment if linked
      if (typedLink.appointment_id) {
        const { data: apt } = await supabase
          .from("appointments")
          .select("id, scheduled_at, duration_minutes, type, status, notes")
          .eq("id", typedLink.appointment_id)
          .single();
        if (apt) setAppointment(apt as AppointmentData);
      }

      // Fetch patient name
      const { data: pat } = await supabase
        .from("patients")
        .select("full_name")
        .eq("id", typedLink.patient_id)
        .single();
      if (pat) setPatient(pat as PatientData);

      setState("valid");
    } catch {
      setErrorMsg("Erro ao carregar portal.");
      setState("invalid");
    }
  };

  const handleConfirmPresence = async () => {
    if (!appointment) return;
    setConfirming(true);
    // Mark link as used
    if (linkData) {
      await supabase
        .from("patient_access_links")
        .update({ used_at: new Date().toISOString() })
        .eq("id", linkData.id);
    }
    toast.success("Presença confirmada! Obrigado.");
    setConfirming(false);
    if (appointment) {
      setAppointment({ ...appointment, status: "confirmed" });
    }
  };

  const handleJoinSession = () => {
    // Find telehealth session linked to this appointment
    if (appointment?.id) {
      supabase
        .from("telehealth_sessions")
        .select("room_token")
        .eq("appointment_id", appointment.id)
        .eq("status", "waiting")
        .single()
        .then(({ data }) => {
          if (data?.room_token) {
            navigate(`/sala/${data.room_token}`);
          } else {
            toast.error("A sala ainda não foi criada pelo profissional.");
          }
        });
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
            <p className="text-xs text-muted-foreground">
              PsicoOne · Plataforma Clínica Inteligente
            </p>
          </Card>
        </motion.div>
      </div>
    );
  }

  const scheduled = appointment ? new Date(appointment.scheduled_at) : null;
  const isOnline = appointment?.type === "online";
  const isConfirmed = appointment?.status === "confirmed" || appointment?.status === "completed";

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
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
          {/* Welcome */}
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">
              Olá, {patient?.full_name?.split(" ")[0] || "Paciente"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Aqui estão os detalhes da sua sessão
            </p>
          </div>

          {/* Appointment Card */}
          {appointment && scheduled && (
            <Card className="border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Sua Sessão</h2>
                  <Badge variant={isConfirmed ? "default" : "secondary"}>
                    {isConfirmed ? "Confirmada" : "Agendada"}
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
                      <p className="font-medium">
                        {format(scheduled, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Horário</p>
                      <p className="font-medium">
                        {format(scheduled, "HH:mm")} · {appointment.duration_minutes || 50} minutos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {isOnline ? (
                        <Video className="h-5 w-5 text-primary" />
                      ) : (
                        <MapPin className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Modalidade</p>
                      <p className="font-medium">{isOnline ? "Online (Videochamada)" : "Presencial"}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-3">
                  {isOnline && (
                    <Button
                      onClick={handleJoinSession}
                      className="w-full gap-2"
                      size="lg"
                    >
                      <Video className="h-5 w-5" />
                      Entrar na Sessão
                    </Button>
                  )}

                  {!isConfirmed && (
                    <Button
                      onClick={handleConfirmPresence}
                      variant={isOnline ? "outline" : "default"}
                      className="w-full gap-2"
                      size="lg"
                      disabled={confirming}
                    >
                      {confirming ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                      Confirmar Presença
                    </Button>
                  )}

                  {isConfirmed && !isOnline && (
                    <div className="bg-primary/5 rounded-lg p-4 text-center">
                      <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="font-medium text-sm">Presença confirmada!</p>
                      <p className="text-xs text-muted-foreground">
                        Aguardamos você no horário agendado.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {isOnline && (
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

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="max-w-lg mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            🔒 Ambiente seguro e criptografado · PsicoOne
          </p>
        </div>
      </footer>
    </div>
  );
}
