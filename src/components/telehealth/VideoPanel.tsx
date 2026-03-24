import { memo, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { VideoOff } from "lucide-react";

interface VideoPanelProps {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirrored?: boolean;
  isFocused?: boolean;
}

export const VideoPanel = memo(function VideoPanel({
  stream, label, muted = false, mirrored = false, isFocused = false,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (stream) {
      el.srcObject = stream;
      const playPromise = el.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.warn("[VideoPanel] Autoplay blocked, retrying on interaction:", err);
          const retry = () => {
            el.play().catch(() => {});
            document.removeEventListener("click", retry);
          };
          document.addEventListener("click", retry, { once: true });
        });
      }
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks().some(t => t.enabled);

  return (
    <Card className={`relative overflow-hidden bg-muted/80 transition-all duration-300 ${
      isFocused ? "aspect-video col-span-full" : "aspect-video"
    }`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${mirrored ? "scale-x-[-1]" : ""} ${!hasVideo ? "hidden" : ""}`}
      />
      {!hasVideo && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              {stream ? (
                <VideoOff className="h-7 w-7 text-muted-foreground" />
              ) : (
                <span className="text-2xl font-bold text-primary">{label[0]?.toUpperCase()}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{stream ? "Câmera desativada" : "Aguardando..."}</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm">
        <p className="text-xs font-medium">{label}</p>
      </div>
    </Card>
  );
});
