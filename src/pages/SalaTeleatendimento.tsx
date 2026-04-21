import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTelehealthWebRTC } from "@/hooks/useTelehealthWebRTC";
import { useTelehealthChat } from "@/hooks/useTelehealthChat";
import { VideoPanel } from "@/components/telehealth/VideoPanel";
import { CallControls } from "@/components/telehealth/CallControls";
import { ChatPanel } from "@/components/telehealth/ChatPanel";
import { ConnectionIndicator } from "@/components/telehealth/ConnectionIndicator";
import { PreCallCheck } from "@/components/telehealth/PreCallCheck";
import { WaitingRoom } from "@/components/telehealth/WaitingRoom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Video, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type RoomState = "loading" | "error" | "name-entry" | "pre-call" | "in-call";

const SalaTeleatendimento = () => {
  const { token } = useParams<{ token: string }>();
  const [patientName, setPatientName] = useState("");
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [roomState, setRoomState] = useState<RoomState>("loading");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chat = useTelehealthChat(token || "", patientName || "Paciente");

  const webrtc = useTelehealthWebRTC({
    roomToken: token || "",
    isHost: false,
    onRemoteStream: setRemoteStream,
  });

  useEffect(() => {
    if (!token) return;
    loadSession();
  }, [token]);

  const loadSession = async () => {
    setRoomState("loading");
    try {
      const { data, error: fetchError } = await supabase
        .from("telehealth_sessions")
        .select("*")
        .eq("room_token", token)
        .single();

      if (fetchError || !data) {
        setError("Sala não encontrada ou link expirado.");
        setRoomState("error");
        return;
      }

      if (data.status === "ended") {
        setError("Esta sessão já foi encerrada.");
        setRoomState("error");
        return;
      }

      setSessionInfo(data);
      setRoomState("name-entry");
    } catch {
      setError("Erro ao carregar sala.");
      setRoomState("error");
    }
  };

  const goToPreCall = useCallback(() => {
    if (!patientName.trim()) {
      toast.error("Digite seu nome para entrar");
      return;
    }
    setRoomState("pre-call");
  }, [patientName]);

  const joinRoom = useCallback(async () => {
    try {
      await webrtc.connect();
      setRoomState("in-call");
      toast.success("Conectado à sessão!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao conectar. Verifique permissões de câmera/microfone.");
      setRoomState("name-entry");
    }
  }, [webrtc]);

  const leaveRoom = useCallback(() => {
    webrtc.disconnect();
    setRoomState("name-entry");
    setRemoteStream(null);
    toast.info("Você saiu da sessão");
  }, [webrtc]);

  if (roomState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (roomState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md">
          <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sessão indisponível</h2>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (roomState === "name-entry") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Consulta Online</h2>
            <p className="text-sm text-muted-foreground mt-1">PsicoOne · Teleatendimento seguro</p>
          </div>

          <div className="space-y-2">
            <Label>Seu nome</Label>
            <Input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Digite seu nome completo"
              onKeyDown={(e) => e.key === "Enter" && goToPreCall()}
            />
          </div>

          <Button onClick={goToPreCall} className="w-full gap-2" size="lg">
            <Video className="h-5 w-5" />
            Continuar
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Ao entrar, você autoriza o uso de câmera e microfone para esta sessão.
          </p>
        </Card>
      </div>
    );
  }

  if (roomState === "pre-call") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <PreCallCheck
          label={`Entrando como ${patientName}`}
          onReady={joinRoom}
          onCancel={() => setRoomState("name-entry")}
        />
      </div>
    );
  }

  // IN-CALL
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-sm">PsicoOne · Teleatendimento</h1>
          <ConnectionIndicator status={webrtc.connectionStatus} />
        </div>
      </div>

      {webrtc.mediaError && (
        <Alert variant="destructive" className="mx-3 mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{webrtc.mediaError}</AlertDescription>
        </Alert>
      )}

      <div className="flex-1 p-3 flex gap-3 min-h-0">
        <div className={`flex-1 flex flex-col gap-3 ${chat.isOpen ? "lg:w-2/3" : "w-full"}`}>
          {!remoteStream ? (
            <div className="flex-1 flex items-center justify-center">
              <WaitingRoom
                patientName={patientName}
                psychologistName={sessionInfo?.psychologist_name}
                onCancel={leaveRoom}
              />
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3">
              <VideoPanel stream={remoteStream} label="Profissional" />
              <VideoPanel stream={webrtc.localStream} label={patientName} muted mirrored />
            </div>
          )}

          <CallControls
            videoEnabled={webrtc.videoEnabled}
            audioEnabled={webrtc.audioEnabled}
            screenSharing={webrtc.screenSharing}
            onToggleVideo={webrtc.toggleVideo}
            onToggleAudio={webrtc.toggleAudio}
            onToggleScreen={webrtc.toggleScreenShare}
            onEndCall={leaveRoom}
            onToggleChat={chat.isOpen ? chat.closeChat : chat.openChat}
            chatUnread={chat.unreadCount}
          />
        </div>

        {chat.isOpen && (
          <div className="w-80 hidden lg:block">
            <ChatPanel messages={chat.messages} onSend={chat.sendMessage} onClose={chat.closeChat} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SalaTeleatendimento;
