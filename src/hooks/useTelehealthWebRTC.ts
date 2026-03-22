import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "unstable" | "reconnecting";

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface UseTelehealthWebRTCOptions {
  roomToken: string;
  isHost: boolean;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStatus?: (status: ConnectionStatus) => void;
}

export function useTelehealthWebRTC({
  roomToken,
  isHost,
  onRemoteStream,
  onConnectionStatus,
}: UseTelehealthWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const makingOfferRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const updateStatus = useCallback((s: ConnectionStatus) => {
    setConnectionStatus(s);
    onConnectionStatus?.(s);
  }, [onConnectionStatus]);

  const createPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        // Free TURN servers for NAT traversal
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
      iceCandidatePoolSize: 10,
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate.toJSON() },
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("[WebRTC] Remote track received:", event.track.kind);
      if (event.streams[0]) {
        onRemoteStream?.(event.streams[0]);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE state:", pc.iceConnectionState);
      switch (pc.iceConnectionState) {
        case "connected":
        case "completed":
          updateStatus("connected");
          reconnectAttemptsRef.current = 0;
          break;
        case "disconnected":
          updateStatus("unstable");
          // Try soft reconnect after 3s
          setTimeout(() => {
            if (pc.iceConnectionState === "disconnected") {
              updateStatus("reconnecting");
              pc.restartIce();
            }
          }, 3000);
          break;
        case "failed":
          handleReconnect(pc);
          break;
        case "closed":
          updateStatus("disconnected");
          break;
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current = true;
        await pc.setLocalDescription();
        channelRef.current?.send({
          type: "broadcast",
          event: "sdp",
          payload: { description: pc.localDescription?.toJSON() },
        });
      } catch (e) {
        console.error("[WebRTC] Negotiation error:", e);
      } finally {
        makingOfferRef.current = false;
      }
    };

    pcRef.current = pc;
    return pc;
  }, [onRemoteStream, updateStatus]);

  const handleReconnect = useCallback((pc: RTCPeerConnection) => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      updateStatus("disconnected");
      console.error("[WebRTC] Max reconnection attempts reached");
      return;
    }
    reconnectAttemptsRef.current++;
    updateStatus("reconnecting");
    console.log(`[WebRTC] Reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
    pc.restartIce();
  }, [updateStatus]);

  const getMediaErrorMessage = (err: unknown): string => {
    if (err instanceof DOMException) {
      switch (err.name) {
        case "NotAllowedError":
          return "Permissão de câmera/microfone negada. Verifique as configurações do navegador.";
        case "NotFoundError":
          return "Nenhuma câmera ou microfone encontrado no dispositivo.";
        case "NotReadableError":
          return "Câmera ou microfone já está em uso por outro aplicativo.";
        case "OverconstrainedError":
          return "Configurações de mídia incompatíveis com o dispositivo.";
        case "AbortError":
          return "A captura de mídia foi cancelada.";
        default:
          return `Erro ao acessar mídia: ${err.message}`;
      }
    }
    return "Erro desconhecido ao acessar câmera/microfone.";
  };

  const startMedia = useCallback(async (videoOn = true, audioOn = true) => {
    setMediaError(null);

    // Try video + audio
    if (videoOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        console.log("[WebRTC] Got media stream: video + audio");
        localStreamRef.current = stream;
        setLocalStream(stream);
        setVideoEnabled(true);
        setAudioEnabled(true);
        originalVideoTrackRef.current = stream.getVideoTracks()[0] || null;
        return stream;
      } catch (err) {
        console.warn("[WebRTC] Video+audio failed, trying audio-only:", err);
      }
    }

    // Fallback: audio only
    if (audioOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        console.log("[WebRTC] Got media stream: audio only");
        localStreamRef.current = stream;
        setLocalStream(stream);
        setVideoEnabled(false);
        setAudioEnabled(true);
        return stream;
      } catch (err) {
        const msg = getMediaErrorMessage(err);
        setMediaError(msg);
        console.error("[WebRTC] Audio-only failed:", err);
        throw new Error(msg);
      }
    }

    throw new Error("Nenhuma mídia solicitada");
  }, []);

  const testMedia = useCallback(async (): Promise<{ video: boolean; audio: boolean; stream: MediaStream | null; error?: string }> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      return { video: true, audio: true, stream };
    } catch (err) {
      // Try audio only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return { video: false, audio: true, stream, error: "Câmera indisponível, apenas áudio." };
      } catch (audioErr) {
        return { video: false, audio: false, stream: null, error: getMediaErrorMessage(audioErr) };
      }
    }
  }, []);

  const stopTestStream = useCallback((stream: MediaStream) => {
    stream.getTracks().forEach(t => t.stop());
  }, []);

  const connect = useCallback(async () => {
    updateStatus("connecting");
    setMediaError(null);

    const stream = await startMedia();
    const pc = createPeerConnection();

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    const channel = supabase.channel(`telehealth:${roomToken}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "sdp" }, async ({ payload }) => {
        const { description } = payload;
        if (!description || !pcRef.current) return;

        const pc = pcRef.current;
        const offerCollision = description.type === "offer" && (makingOfferRef.current || pc.signalingState !== "stable");

        if (offerCollision && isHost) return;

        try {
          await pc.setRemoteDescription(description);
          for (const c of pendingCandidatesRef.current) {
            await pc.addIceCandidate(c);
          }
          pendingCandidatesRef.current = [];

          if (description.type === "offer") {
            await pc.setLocalDescription();
            channel.send({
              type: "broadcast",
              event: "sdp",
              payload: { description: pc.localDescription?.toJSON() },
            });
          }
        } catch (e) {
          console.error("[WebRTC] SDP handling error:", e);
        }
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        const { candidate } = payload;
        if (!candidate) return;

        try {
          if (pcRef.current?.remoteDescription) {
            await pcRef.current.addIceCandidate(candidate);
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
        } catch (e) {
          console.error("[WebRTC] ICE candidate error:", e);
        }
      })
      .on("broadcast", { event: "peer-joined" }, async () => {
        if (isHost && pcRef.current) {
          try {
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            channel.send({
              type: "broadcast",
              event: "sdp",
              payload: { description: pcRef.current.localDescription?.toJSON() },
            });
          } catch (e) {
            console.error("[WebRTC] Offer creation error:", e);
          }
        }
      })
      .on("broadcast", { event: "end-call" }, () => {
        // Remote peer ended the call
        disconnect();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (!isHost) {
            channel.send({ type: "broadcast", event: "peer-joined", payload: {} });
          }
        }
      });

    channelRef.current = channel;
  }, [roomToken, isHost, startMedia, createPeerConnection, updateStatus]);

  const disconnect = useCallback(() => {
    // Notify remote peer
    channelRef.current?.send({ type: "broadcast", event: "end-call", payload: {} });

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    channelRef.current?.unsubscribe();
    pcRef.current = null;
    channelRef.current = null;
    localStreamRef.current = null;
    setLocalStream(null);
    setVideoEnabled(true);
    setAudioEnabled(true);
    setScreenSharing(false);
    setMediaError(null);
    reconnectAttemptsRef.current = 0;
    updateStatus("disconnected");
  }, [updateStatus]);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVideoEnabled(track.enabled);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setAudioEnabled(track.enabled);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!pcRef.current) return;

    try {
      if (!screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);

        screenTrack.onended = () => {
          const original = originalVideoTrackRef.current;
          if (original && sender) sender.replaceTrack(original);
          setScreenSharing(false);
        };

        setScreenSharing(true);
      } else {
        const original = originalVideoTrackRef.current;
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender && original) await sender.replaceTrack(original);
        setScreenSharing(false);
      }
    } catch (e) {
      console.error("[WebRTC] Screen share error:", e);
    }
  }, [screenSharing]);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      channelRef.current?.unsubscribe();
    };
  }, []);

  return {
    localStream,
    connectionStatus,
    videoEnabled,
    audioEnabled,
    screenSharing,
    mediaError,
    connect,
    disconnect,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    testMedia,
    stopTestStream,
  };
}
