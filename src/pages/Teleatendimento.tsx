import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Video, Clock, Users, Copy, ExternalLink, Mic, MicOff, AlertTriangle, ScrollText, NotebookPen } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DebugOverlay } from "@/components/telehealth/DebugOverlay";
import { SessionActions } from "@/components/telehealth/SessionActions";
import { useTelehealthWebRTC } from "@/hooks/useTelehealthWebRTC";
import { useTelehealthChat } from "@/hooks/useTelehealthChat";
import { useSessionTranscription } from "@/hooks/useSessionTranscription";
import { useWaitingRoomNotifier } from "@/hooks/useWaitingRoomNotifier";
import { VideoPanel } from "@/components/telehealth/VideoPanel";
import { CallControls, type VideoLayout } from "@/components/telehealth/CallControls";
import { ChatPanel } from "@/components/telehealth/ChatPanel";
import { ConnectionIndicator } from "@/components/telehealth/ConnectionIndicator";
import { PostSessionSummary } from "@/components/telehealth/PostSessionSummary";
import { PreCallCheck } from "@/components/telehealth/PreCallCheck";
import { LiveSessionNotes } from "@/components/telehealth/LiveSessionNotes";
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

type ViewState = "lobby" | "pre-call" | "in-call" | "post-session";

const Teleatendimento = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionRecord | null>(null);
  const [viewState, setViewState] = useState<ViewState>("lobby");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStartTime, setCallStartTime] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);

  // Premium UI state
  const [videoLayout, setVideoLayout] = useState<VideoLayout>("grid");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const callContainerRef = useRef<HTMLDivElement>(null);

  // Transcription & privacy
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Live notes panel
  const [notesOpen, setNotesOpen] = useState(false);
  const [psychologistId, setPsychologistId] = useState<string | null>(null);

  useWaitingRoomNotifier({ psychologistId });


  const selectedPatientName = patients.find((p) => p.id === selectedPatient)?.full_name || "";

  const chat = useTelehealthChat(currentSession?.room_token || "", "Profissional");

  const webrtc = useTelehealthWebRTC({
    roomToken: currentSession?.room_token || "",
    isHost: true,
    onRemoteStream: setRemoteStream,
  });

  const transcription = useSessionTranscription({
    enabled: transcriptionEnabled && viewState === "in-call",
    localLabel: "Profissional",
    remoteLabel: selectedPatientName || "Paciente",
  });

  useEffect(() => { loadData(); }, []);

  // Auto-start from Agenda: /teleatendimento?session=TOKEN&appointment=ID&autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get("session");
    const autostart = params.get("autostart");
    if (!sessionToken || !autostart) return;
    (async () => {
      const { data } = await supabase
        .from("telehealth_sessions")
        .select("*")
        .eq("room_token", sessionToken)
        .maybeSingle();
      if (!data) return;
      setCurrentSession(data as any);
      setSelectedPatient((data as any).patient_id || "");
      // Skip privacy gate, jump straight into pre-call
      setPrivacyAccepted(true);
      setViewState("pre-call");
      // Clean URL
      window.history.replaceState({}, "", "/teleatendimento");
    })();
  }, []);

  // FAB integration
  useEffect(() => {
    const handler = () => setViewState("lobby");
    window.addEventListener("psicoone:new-session", handler);
    return () => window.removeEventListener("psicoone:new-session", handler);
  }, []);

  useEffect(() => {
    if (viewState !== "in-call" || !callStartTime) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - callStartTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [viewState, callStartTime]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && callContainerRef.current) {
      callContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setPsychologistId(session.user.id);

    const [patientsRes, sessionsRes] = await Promise.all([
      supabase.from("patients").select("id, full_name").eq("status", "active").order("full_name"),
      supabase.from("telehealth_sessions").select("*").eq("psychologist_id", session.user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (patientsRes.data) setPatients(patientsRes.data);
    if (sessionsRes.data) setSessions(sessionsRes.data as any);
  };

  const createSession = useCallback(async () => {
    if (!selectedPatient) { toast.error("Selecione um paciente"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error } = await supabase
      .from("telehealth_sessions")
      .insert({ psychologist_id: session.user.id, patient_id: selectedPatient, status: "waiting" } as any)
      .select().single();
    if (error) { toast.error("Erro ao criar sessão"); return; }
    setCurrentSession(data as any);
    return data as any;
  }, [selectedPatient]);

  const handleStartPreCall = useCallback(async () => {
    if (!selectedPatient) { toast.error("Selecione um paciente"); return; }
    let sess = currentSession;
    if (!sess) { sess = await createSession(); if (!sess) return; }
    setPrivacyAccepted(false);
    setViewState("pre-call");
  }, [selectedPatient, currentSession, createSession]);

  const handlePreCallReady = useCallback(async () => {
    if (!currentSession) return;
    try {
      await supabase.from("telehealth_sessions")
        .update({ status: "active", started_at: new Date().toISOString() } as any)
        .eq("id", currentSession.id);
      // Mark linked appointment as LIVE so patient can join the waiting room
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession && currentSession.patient_id) {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
        await supabase
          .from("appointments")
          .update({ meeting_status: "live" } as any)
          .eq("psychologist_id", authSession.user.id)
          .eq("patient_id", currentSession.patient_id)
          .eq("type", "online")
          .gte("scheduled_at", startOfToday)
          .lt("scheduled_at", endOfToday);
      }
      await webrtc.connect();
      setCallStartTime(Date.now());
      setViewState("in-call");
      if (transcriptionEnabled) transcription.startListening();
      const link = `${window.location.origin}/sala/${currentSession.room_token}`;
      await navigator.clipboard.writeText(link);
      toast.success("Link da sala copiado! Envie para o paciente.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao iniciar chamada. Verifique permissões de câmera/microfone.");
      setViewState("lobby");
    }
  }, [currentSession, webrtc, transcriptionEnabled, transcription]);

  const endCall = useCallback(async () => {
    if (isFullscreen) document.exitFullscreen().catch(() => {});
    transcription.stopListening();
    webrtc.disconnect();
    const duration = Math.floor((Date.now() - callStartTime) / 1000);
    if (currentSession) {
      await supabase.from("telehealth_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString(), duration_seconds: duration, chat_messages: chat.messages } as any)
        .eq("id", currentSession.id);
      // Mark today's online appointments as finished for this patient
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession && currentSession.patient_id) {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
        await supabase
          .from("appointments")
          .update({ meeting_status: "finished" } as any)
          .eq("psychologist_id", authSession.user.id)
          .eq("patient_id", currentSession.patient_id)
          .eq("type", "online")
          .gte("scheduled_at", startOfToday)
          .lt("scheduled_at", endOfToday);
      }
      setCurrentSession({ ...currentSession, duration_seconds: duration } as any);
    }
    setViewState("post-session");
    setRemoteStream(null);
    toast.success("Chamada encerrada");
  }, [webrtc, currentSession, callStartTime, chat.messages, transcription, isFullscreen]);

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
          transcript={transcription.transcript}
          onSavedToRecord={() => {
            transcription.clearTranscript();
            loadData();
            setViewState("lobby");
            setCurrentSession(null);
          }}
          onClose={() => {
            transcription.clearTranscript();
            loadData();
            setViewState("lobby");
            setCurrentSession(null);
          }}
        />
      </AppLayout>
    );
  }

  // PRE-CALL CHECK
  if (viewState === "pre-call") {
    return (
      <AppLayout title="Teleatendimento" description="Verificação de mídia">
        <div className="flex items-center justify-center py-8">
          <div className="space-y-4 max-w-lg w-full">
            {!privacyAccepted && (
              <Card className="p-5 space-y-4 border-primary/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Consentimento de sessão</h3>
                    <p className="text-xs text-muted-foreground">
                      Esta sessão poderá ser analisada pela IA para geração automática de prontuário clínico.
                      Nenhum dado será compartilhado externamente.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <Label htmlFor="transcription-toggle" className="text-xs cursor-pointer">
                    Habilitar transcrição de áudio
                  </Label>
                  <Switch id="transcription-toggle" checked={transcriptionEnabled} onCheckedChange={setTranscriptionEnabled} />
                </div>
                {transcriptionEnabled && !transcription.supported && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Transcrição não suportada neste navegador. Use Chrome para melhor experiência.
                    </AlertDescription>
                  </Alert>
                )}
                <Button onClick={() => setPrivacyAccepted(true)} className="w-full">Aceitar e continuar</Button>
              </Card>
            )}
            {privacyAccepted && (
              <PreCallCheck
                label={`Consulta com ${selectedPatientName}`}
                onReady={handlePreCallReady}
                onCancel={() => setViewState("lobby")}
              />
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // IN-CALL — Premium layout
  if (viewState === "in-call") {
    return (
      <AppLayout title="Teleatendimento" description="Em consulta">
        <div ref={callContainerRef} className={`space-y-3 ${isFullscreen ? "bg-background p-4 h-screen flex flex-col" : ""}`}>
          {/* Top bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <ConnectionIndicator status={webrtc.connectionStatus} />
              <Badge variant="outline" className="gap-1 font-mono text-xs">
                <Clock className="h-3 w-3" />
                {formatDuration(elapsed)}
              </Badge>
              <span className="text-sm font-medium">{selectedPatientName}</span>
              {transcription.isListening && (
                <Badge variant="secondary" className="gap-1 text-xs animate-pulse">
                  <ScrollText className="h-3 w-3" />
                  Transcrevendo
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {transcription.supported && (
                <Button
                  variant={transcription.isListening ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => transcription.isListening ? transcription.stopListening() : transcription.startListening()}
                  className="gap-1.5 text-xs"
                >
                  {transcription.isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  {transcription.isListening ? "Parar" : "Transcrever"}
                </Button>
              )}
              <Button
                variant={notesOpen ? "secondary" : "outline"}
                size="sm"
                onClick={() => setNotesOpen((v) => !v)}
                className="gap-1.5 text-xs"
              >
                <NotebookPen className="h-3.5 w-3.5" />
                Anotações
              </Button>
              <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
                <Copy className="h-3.5 w-3.5" />
                Link
              </Button>
              <DebugOverlay debug={webrtc.debugInfo} />
            </div>
          </div>


          {/* Media error */}
          {webrtc.mediaError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{webrtc.mediaError}</AlertDescription>
            </Alert>
          )}

          {/* Interim transcription */}
          {transcription.interimText && (
            <div className="p-2 rounded bg-muted/30 border border-border text-xs text-muted-foreground italic truncate">
              {transcription.interimText}
            </div>
          )}

          {/* Video area */}
          <div className={`flex gap-3 ${isFullscreen ? "flex-1 min-h-0" : ""}`}>
            <div className={`flex-1 space-y-3 ${chat.isOpen ? "" : "w-full"}`}>
              {videoLayout === "grid" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <VideoPanel stream={remoteStream} label="Paciente" />
                  <VideoPanel stream={webrtc.localStream} label="Você" muted mirrored />
                </div>
              ) : (
                <div className="relative">
                  <VideoPanel stream={remoteStream} label="Paciente" isFocused />
                  <div className="absolute bottom-4 right-4 w-48 z-10">
                    <VideoPanel stream={webrtc.localStream} label="Você" muted mirrored />
                  </div>
                </div>
              )}

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
                layout={videoLayout}
                onLayoutChange={setVideoLayout}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
                availableDevices={webrtc.availableDevices}
                selectedVideoDevice={webrtc.selectedVideoDevice}
                selectedAudioDevice={webrtc.selectedAudioDevice}
                onSwitchDevice={webrtc.switchDevice}
              />
            </div>

            {chat.isOpen && (
              <div className="w-80 hidden lg:flex flex-col h-[calc(100vh-16rem)]">
                <ChatPanel messages={chat.messages} onSend={chat.sendMessage} onClose={chat.closeChat} />
              </div>
            )}

            {notesOpen && currentSession && (
              <div className="w-80 hidden lg:flex flex-col h-[calc(100vh-16rem)]">
                <LiveSessionNotes
                  sessionId={currentSession.id}
                  initialValue={(currentSession as any).live_notes}
                  onClose={() => setNotesOpen(false)}
                />
              </div>
            )}
          </div>


          {currentSession && (
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <p className="text-xs truncate flex-1 text-muted-foreground">
                  <strong className="text-foreground">Link:</strong> {window.location.origin}/sala/{currentSession.room_token}
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

          <Button onClick={handleStartPreCall} className="w-full gap-2" size="lg">
            <Video className="h-5 w-5" />
            Iniciar Consulta
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Um link seguro será gerado e copiado automaticamente para enviar ao paciente
          </p>
        </Card>

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
                  <div className="flex items-center gap-1">
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
                    <SessionActions sessionId={s.id} status={s.status} onUpdate={loadData} />
                  </div>
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
