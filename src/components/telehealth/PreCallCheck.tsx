import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Video, Mic, MicOff, VideoOff, CheckCircle2, XCircle, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

interface PreCallCheckProps {
  onReady: () => void;
  onCancel: () => void;
  label: string;
}

export function PreCallCheck({ onReady, onCancel, label }: PreCallCheckProps) {
  const [checking, setChecking] = useState(true);
  const [videoOk, setVideoOk] = useState(false);
  const [audioOk, setAudioOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const runCheck = useCallback(async () => {
    setChecking(true);
    setError(null);
    setVideoOk(false);
    setAudioOk(false);

    // Stop previous stream
    stream?.getTracks().forEach(t => t.stop());

    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      setVideoOk(s.getVideoTracks().length > 0);
      setAudioOk(s.getAudioTracks().length > 0);
      setStream(s);
    } catch (err) {
      // Try audio only
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioOk(true);
        setStream(s);
        setError("Câmera indisponível. Você entrará apenas com áudio.");
      } catch {
        setError("Não foi possível acessar câmera nem microfone. Verifique as permissões do navegador.");
      }
    } finally {
      setChecking(false);
    }
  }, [stream]);

  useEffect(() => {
    runCheck();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Bind stream to video element
  useEffect(() => {
    if (videoRef.current && stream && stream.getVideoTracks().length > 0) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleReady = () => {
    // Stop test stream before joining — connect() will acquire its own
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    onReady();
  };

  const canProceed = audioOk; // at minimum, audio must work

  return (
    <Card className="p-6 max-w-lg w-full mx-auto space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold">Preparação da consulta</h2>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>

      {/* Video preview */}
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        {stream && videoOk ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <VideoOff className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Sem vídeo</p>
            </div>
          </div>
        )}
      </div>

      {/* Device status */}
      <div className="flex justify-center gap-4">
        <DeviceStatus icon={Video} label="Câmera" ok={videoOk} checking={checking} />
        <DeviceStatus icon={Mic} label="Microfone" ok={audioOk} checking={checking} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        {!checking && !canProceed && (
          <Button onClick={runCheck} variant="secondary" className="flex-1 gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        )}
        {canProceed && (
          <Button onClick={handleReady} className="flex-1 gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Entrar na consulta
          </Button>
        )}
      </div>
    </Card>
  );
}

function DeviceStatus({ icon: Icon, label, ok, checking }: { icon: typeof Video; label: string; ok: boolean; checking: boolean }) {
  return (
    <Badge variant={checking ? "secondary" : ok ? "default" : "destructive"} className="gap-1.5 py-1.5 px-3">
      {checking ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : ok ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      {label}
    </Badge>
  );
}
