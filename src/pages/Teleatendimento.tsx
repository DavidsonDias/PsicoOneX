import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Video, Clock, Users, Copy, ExternalLink } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTelehealthWebRTC } from "@/hooks/useTelehealthWebRTC";
import { useTelehealthChat } from "@/hooks/useTelehealthChat";
import { VideoPanel } from "@/components/telehealth/VideoPanel";
import { CallControls } from "@/components/telehealth/CallControls";
import { ChatPanel } from "@/components/telehealth/ChatPanel";
import { ConnectionIndicator } from "@/components/telehealth/ConnectionIndicator";
import { PostSessionSummary } from "@/components/telehealth/PostSessionSummary";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Patient {
  id: string;
  full_name: string;
}

interface SessionRecord {
  id: string;
  room_token: string;
  patient_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

type ViewState = "lobby" | "in-call" | "post-session";

const Teleatendimento = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionRecord | null>(null);
  const [viewState, setViewState] = useState<ViewState>("lobby");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStartTime, setCallStartTime] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);

  const selectedPatientName = patients.find((p) => p.id === selectedPatient)?.full_name || "";

  const chat = useTelehealthChat(
    currentSession?.room_token || "",
    "Profissional"
  );

  const webrtc = useTelehealthWebRTC({
    roomToken: currentSession?.room_token || "",
    isHost: true,
    onRemoteStream: setRemoteStream,
  });

  useEffect(() => {
    loadData();
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (viewState !== "in-call" || !callStartTime) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - callStartTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [viewState, callStartTime]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [patientsRes, sessionsRes] = await Promise.all([
      supabase.from("patients").select("id, full_name").eq("status", "active").order("full_name"),
      supabase.from("telehealth_sessions").select("*").eq("psychologist_id", session.user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    if (patientsRes.data) setPatients(patientsRes.data);
    if (sessionsRes.data) setSessions(sessionsRes.data as any);
  };

  const createSession = useCallback(async () => {
    if (!selectedPatient) {
      toast.error("Selecione um paciente");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("telehealth_sessions")
      .insert({
        psychologist_id: session.user.id,
        patient_id: selectedPatient,
        status: "waiting",
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar sessão");
      console.error(error);
      return;
    }

    setCurrentSession(data as any);
    return data as any;
  }, [selectedPatient]);

  const startCall = useCallback(async () => {
    let sess = currentSession;
    if (!sess) {
      sess = await createSession();
      if (!sess) return;
    }

    try {
      // Update session status
      await supabase
        .from("telehealth_sessions")
        .update({ status: "active", started_at: new Date().toISOString() } as any)
        .eq("id", sess.id);

      await webrtc.connect();
      setCallStartTime(Date.now());
      setViewState("in-call");

      // Copy link
      const link = `${window.location.origin}/sala/${sess.room_token}`;
      await navigator.clipboard.writeText(link);
      toast.success("Link da sala copiado! Envie para o paciente.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao iniciar. Verifique permissões de câmera/microfone.");
    }
  }, [currentSession, createSession, webrtc]);

  const endCall = useCallback(async () => {
    webrtc.disconnect();
    const duration = Math.floor((Date.now() - callStartTime) / 1000);

    if (currentSession) {
      await supabase
        .from("telehealth_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          chat_messages: chat.messages,
        } as any)
        .eq("id", currentSession.id);

      setCurrentSession({ ...currentSession, duration_seconds: duration } as any);
    }

    setViewState("post-session");
    setRemoteStream(null);
    toast.success("Chamada encerrada");
  }, [webrtc, currentSession, callStartTime, chat.messages]);

  const copyLink = async () => {
    if (!currentSession) return;
    const link = `${window.location.origin}/sala/${currentSession.room_token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // POST-SESSION
  if (viewState === "post-session" && currentSession) {
    return (
      <AppLayout title="Teleatendimento" description="Sessão finalizada">
        <PostSessionSummary
          sessionId={currentSession.id}
          patientId={currentSession.patient_id}
          patientName={selectedPatientName}
          chatMessages={chat.messages}
          durationSeconds={currentSession.duration_seconds || elapsed}
          onSavedToRecord={() => {
            loadData();
            setViewState("lobby");
            setCurrentSession(null);
          }}
          onClose={() => {
            loadData();
            setViewState("lobby");
            setCurrentSession(null);
          }}
        />
      </AppLayout>
    );
  }

  // IN-CALL
  if (viewState === "in-call") {
    return (
      <AppLayout title="Teleatendimento" description="Em consulta">
        <div className="space-y-3">
          {/* Call header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <ConnectionIndicator status={webrtc.connectionStatus} />
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(elapsed)}
              </Badge>
              <span className="text-sm font-medium">{selectedPatientName}</span>
            </div>
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" />
              Copiar link
            </Button>
          </div>

          {/* Videos + Chat */}
          <div className="flex gap-3">
            <div className={`flex-1 space-y-3 ${chat.isOpen ? "" : "w-full"}`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <VideoPanel stream={remoteStream} label="Paciente" />
                <VideoPanel stream={webrtc.localStream} label="Você" muted mirrored />
              </div>
              <CallControls
                videoEnabled={webrtc.videoEnabled}
                audioEnabled={webrtc.audioEnabled}
                screenSharing={webrtc.screenSharing}
                onToggleVideo={webrtc.toggleVideo}
                onToggleAudio={webrtc.toggleAudio}
                onToggleScreen={webrtc.toggleScreenShare}
                onEndCall={endCall}
                onToggleChat={chat.isOpen ? chat.closeChat : chat.openChat}
                chatUnread={chat.unreadCount}
              />
            </div>

            {chat.isOpen && (
              <div className="w-80 hidden lg:flex flex-col h-[calc(100vh-16rem)]">
                <ChatPanel messages={chat.messages} onSend={chat.sendMessage} onClose={chat.closeChat} />
              </div>
            )}
          </div>

          {/* Room link */}
          {currentSession && (
            <Card className="p-3 bg-primary/5">
              <div className="flex items-center justify-between">
                <p className="text-sm truncate flex-1">
                  <strong>Link:</strong> {window.location.origin}/sala/{currentSession.room_token}
                </p>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}
        </div>
      </AppLayout>
    );
  }

  // LOBBY
  return (
    <AppLayout title="Teleatendimento" description="Consultas online seguras">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Start new session */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Iniciar Consulta Online</h2>
              <p className="text-sm text-muted-foreground">Selecione o paciente e inicie a videochamada</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Paciente</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={startCall} className="w-full gap-2" size="lg">
            <Video className="h-5 w-5" />
            Iniciar Consulta
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Um link seguro será gerado e copiado automaticamente para enviar ao paciente
          </p>
        </Card>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Sessões recentes</h3>
            </div>

            <div className="space-y-2">
              {sessions.slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={s.status === "ended" ? "secondary" : s.status === "active" ? "default" : "outline"}
                      className="text-xs"
                    >
                      {s.status === "ended" ? "Finalizada" : s.status === "active" ? "Ativa" : "Aguardando"}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {patients.find((p) => p.id === s.patient_id)?.full_name || "Paciente"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {s.duration_seconds ? ` · ${Math.round(s.duration_seconds / 60)} min` : ""}
                      </p>
                    </div>
                  </div>
                  {s.status === "waiting" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const link = `${window.location.origin}/sala/${s.room_token}`;
                        navigator.clipboard.writeText(link);
                        toast.success("Link copiado!");
                      }}
                      className="gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Link
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Teleatendimento;
