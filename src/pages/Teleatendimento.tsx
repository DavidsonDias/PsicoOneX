import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Phone } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

interface Patient {
  id: string;
  full_name: string;
}

const Teleatendimento = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [inCall, setInCall] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    checkAuthAndLoadPatients();
  }, []);

  const checkAuthAndLoadPatients = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");

    if (error) {
      toast.error("Erro ao carregar pacientes");
      return;
    }
    setPatients(data || []);
  };

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 15);
    setRoomId(id);
    return id;
  };

  const startCall = async () => {
    if (!selectedPatient) {
      toast.error("Selecione um paciente");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const newRoomId = roomId || generateRoomId();
      setInCall(true);

      const roomLink = `${window.location.origin}/sala/${newRoomId}`;
      await navigator.clipboard.writeText(roomLink);
      toast.success("Link da sala copiado! Envie para o paciente.");

      initializeWebRTC(stream);
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Erro ao acessar câmera/microfone");
    }
  };

  const initializeWebRTC = (stream: MediaStream) => {
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("New ICE candidate:", event.candidate);
      }
    };
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
        
        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setScreenSharing(true);
      } else {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
        
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }

        setScreenSharing(false);
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      toast.error("Erro ao compartilhar tela");
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    setInCall(false);
    setVideoEnabled(true);
    setAudioEnabled(true);
    setScreenSharing(false);
    setRoomId("");
    
    toast.success("Chamada encerrada");
  };

  return (
    <AppLayout title="Teleatendimento" description="Consultas online seguras">
      {!inCall ? (
        <Card className="max-w-2xl mx-auto p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Iniciar Consulta Online</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="patient">Selecione o Paciente</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomId">ID da Sala (opcional)</Label>
              <Input
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Deixe vazio para gerar automaticamente"
              />
              <p className="text-xs text-muted-foreground">
                Um link único será gerado e copiado automaticamente
              </p>
            </div>

            <Button onClick={startCall} className="w-full gap-2">
              <Video className="h-5 w-5" />
              Iniciar Consulta
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="relative aspect-video bg-muted overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-background/80 px-3 py-1 rounded-md">
                <p className="text-sm font-medium">Paciente</p>
              </div>
            </Card>

            <Card className="relative aspect-video bg-muted overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-background/80 px-3 py-1 rounded-md">
                <p className="text-sm font-medium">Você</p>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={audioEnabled ? "default" : "destructive"}
                size="icon"
                onClick={toggleAudio}
                className="h-12 w-12 rounded-full"
              >
                {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              <Button
                variant={videoEnabled ? "default" : "destructive"}
                size="icon"
                onClick={toggleVideo}
                className="h-12 w-12 rounded-full"
              >
                {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>

              <Button
                variant={screenSharing ? "secondary" : "default"}
                size="icon"
                onClick={toggleScreenShare}
                className="h-12 w-12 rounded-full"
              >
                {screenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              </Button>

              <Button
                variant="destructive"
                size="icon"
                onClick={endCall}
                className="h-12 w-12 rounded-full"
              >
                <Phone className="h-5 w-5" />
              </Button>
            </div>
          </Card>

          {roomId && (
            <Card className="p-4 bg-primary/5">
              <p className="text-sm text-center">
                <strong>Link da Sala:</strong> {window.location.origin}/sala/{roomId}
              </p>
              <p className="text-xs text-center text-muted-foreground mt-1">
                Link copiado para área de transferência
              </p>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default Teleatendimento;
