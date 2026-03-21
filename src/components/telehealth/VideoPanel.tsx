import { memo, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

interface VideoPanelProps {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirrored?: boolean;
}

export const VideoPanel = memo(function VideoPanel({ stream, label, muted = false, mirrored = false }: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <Card className="relative aspect-video bg-muted overflow-hidden">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">{label[0]?.toUpperCase()}</span>
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-md">
        <p className="text-sm font-medium">{label}</p>
      </div>
    </Card>
  );
});
