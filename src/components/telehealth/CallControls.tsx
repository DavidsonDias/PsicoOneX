import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Phone,
  MessageSquare, Maximize, Minimize, LayoutGrid, User, ChevronUp,
  Settings2,
} from "lucide-react";
import type { MediaDeviceOption } from "@/hooks/useTelehealthWebRTC";

export type VideoLayout = "grid" | "focus";

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
  // Premium features
  layout?: VideoLayout;
  onLayoutChange?: (layout: VideoLayout) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  // Device selection
  availableDevices?: MediaDeviceOption[];
  selectedVideoDevice?: string;
  selectedAudioDevice?: string;
  onSwitchDevice?: (kind: "video" | "audio", deviceId: string) => void;
}

export const CallControls = memo(function CallControls({
  videoEnabled, audioEnabled, screenSharing,
  onToggleVideo, onToggleAudio, onToggleScreen,
  onEndCall, onToggleChat, chatUnread = 0,
  layout = "grid", onLayoutChange, isFullscreen, onToggleFullscreen,
  availableDevices = [], selectedVideoDevice, selectedAudioDevice, onSwitchDevice,
}: CallControlsProps) {
  const videoDevices = availableDevices.filter(d => d.kind === "videoinput");
  const audioDevices = availableDevices.filter(d => d.kind === "audioinput");

  return (
    <Card className="p-3 bg-card/95 backdrop-blur-sm border-border/50">
      <div className="flex items-center justify-center gap-2">
        {/* Audio with device picker */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={audioEnabled ? "outline" : "destructive"}
                size="icon"
                onClick={onToggleAudio}
                className="h-11 w-11 rounded-full"
              >
                {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{audioEnabled ? "Desativar microfone" : "Ativar microfone"}</TooltipContent>
          </Tooltip>
          {audioDevices.length > 1 && onSwitchDevice && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1">
                  <ChevronUp className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" side="top">
                <DropdownMenuLabel className="text-xs">Microfone</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {audioDevices.map(d => (
                  <DropdownMenuItem
                    key={d.deviceId}
                    onClick={() => onSwitchDevice("audio", d.deviceId)}
                    className={d.deviceId === selectedAudioDevice ? "bg-accent" : ""}
                  >
                    <span className="text-xs truncate max-w-[200px]">{d.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Video with device picker */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={videoEnabled ? "outline" : "destructive"}
                size="icon"
                onClick={onToggleVideo}
                className="h-11 w-11 rounded-full"
              >
                {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{videoEnabled ? "Desativar câmera" : "Ativar câmera"}</TooltipContent>
          </Tooltip>
          {videoDevices.length > 1 && onSwitchDevice && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1">
                  <ChevronUp className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" side="top">
                <DropdownMenuLabel className="text-xs">Câmera</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {videoDevices.map(d => (
                  <DropdownMenuItem
                    key={d.deviceId}
                    onClick={() => onSwitchDevice("video", d.deviceId)}
                    className={d.deviceId === selectedVideoDevice ? "bg-accent" : ""}
                  >
                    <span className="text-xs truncate max-w-[200px]">{d.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Screen share */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={screenSharing ? "secondary" : "outline"}
              size="icon"
              onClick={onToggleScreen}
              className="h-11 w-11 rounded-full"
            >
              {screenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{screenSharing ? "Parar compartilhamento" : "Compartilhar tela"}</TooltipContent>
        </Tooltip>

        {/* Layout toggle */}
        {onLayoutChange && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onLayoutChange(layout === "grid" ? "focus" : "grid")}
                className="h-11 w-11 rounded-full"
              >
                {layout === "grid" ? <User className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{layout === "grid" ? "Modo foco" : "Modo grade"}</TooltipContent>
          </Tooltip>
        )}

        {/* Fullscreen */}
        {onToggleFullscreen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleFullscreen}
                className="h-11 w-11 rounded-full"
              >
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isFullscreen ? "Sair tela cheia" : "Tela cheia"}</TooltipContent>
          </Tooltip>
        )}

        {/* Chat */}
        {onToggleChat && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onToggleChat} className="h-11 w-11 rounded-full relative">
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

        {/* End call */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="destructive" size="icon" onClick={onEndCall} className="h-11 w-11 rounded-full ml-2">
              <Phone className="h-5 w-5 rotate-[135deg]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Encerrar chamada</TooltipContent>
        </Tooltip>
      </div>
    </Card>
  );
});
