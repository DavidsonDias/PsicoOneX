import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Phone, MessageSquare } from "lucide-react";

interface CallControlsProps {
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreen: () => void;
  onEndCall: () => void;
  onToggleChat?: () => void;
  chatUnread?: number;
}

export const CallControls = memo(function CallControls({
  videoEnabled, audioEnabled, screenSharing,
  onToggleVideo, onToggleAudio, onToggleScreen,
  onEndCall, onToggleChat, chatUnread = 0,
}: CallControlsProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={audioEnabled ? "outline" : "destructive"}
              size="icon"
              onClick={onToggleAudio}
              className="h-12 w-12 rounded-full"
            >
              {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{audioEnabled ? "Desativar microfone" : "Ativar microfone"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={videoEnabled ? "outline" : "destructive"}
              size="icon"
              onClick={onToggleVideo}
              className="h-12 w-12 rounded-full"
            >
              {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{videoEnabled ? "Desativar câmera" : "Ativar câmera"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={screenSharing ? "secondary" : "outline"}
              size="icon"
              onClick={onToggleScreen}
              className="h-12 w-12 rounded-full"
            >
              {screenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{screenSharing ? "Parar compartilhamento" : "Compartilhar tela"}</TooltipContent>
        </Tooltip>

        {onToggleChat && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onToggleChat} className="h-12 w-12 rounded-full relative">
                <MessageSquare className="h-5 w-5" />
                {chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {chatUnread}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Chat</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="destructive" size="icon" onClick={onEndCall} className="h-12 w-12 rounded-full">
              <Phone className="h-5 w-5 rotate-[135deg]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Encerrar chamada</TooltipContent>
        </Tooltip>
      </div>
    </Card>
  );
});
