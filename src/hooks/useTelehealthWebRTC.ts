import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "unstable" | "reconnecting";

export interface MediaDeviceOption {
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

const VIDEO_CONSTRAINTS_TIERS = [
  { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
  { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
  { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
  true, // any video
];

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

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
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceOption[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");

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

  // Enumerate devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mapped: MediaDeviceOption[] = devices
        .filter(d => d.kind === "videoinput" || d.kind === "audioinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `${d.kind === "videoinput" ? "Câmera" : "Microfone"} ${i + 1}`,
          kind: d.kind,
        }));
      setAvailableDevices(mapped);
      return mapped;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    enumerateDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", enumerateDevices);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", enumerateDevices);
  }, [enumerateDevices]);

  const createPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
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

  // Progressive resolution fallback
  const startMedia = useCallback(async (videoOn = true, audioOn = true) => {
    setMediaError(null);

    const audioConstraints: any = audioOn
      ? (selectedAudioDevice ? { ...AUDIO_CONSTRAINTS, deviceId: { exact: selectedAudioDevice } } : AUDIO_CONSTRAINTS)
      : false;

    if (videoOn) {
      for (const videoConstraint of VIDEO_CONSTRAINTS_TIERS) {
        try {
          const vc = typeof videoConstraint === "object" && selectedVideoDevice
            ? { ...videoConstraint, deviceId: { exact: selectedVideoDevice } }
            : videoConstraint;

          const stream = await navigator.mediaDevices.getUserMedia({
            video: vc,
            audio: audioConstraints,
          });
          console.log("[WebRTC] Got media stream with video constraint:", JSON.stringify(videoConstraint));
          localStreamRef.current = stream;
          setLocalStream(stream);
          setVideoEnabled(true);
          setAudioEnabled(audioOn);
          originalVideoTrackRef.current = stream.getVideoTracks()[0] || null;
          await enumerateDevices();
          return stream;
        } catch (err) {
          console.warn("[WebRTC] Video constraint failed, trying next tier:", err);
        }
      }
    }

    // Fallback: audio only
    if (audioOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        console.log("[WebRTC] Got media stream: audio only");
        localStreamRef.current = stream;
        setLocalStream(stream);
        setVideoEnabled(false);
        setAudioEnabled(true);
        await enumerateDevices();
        return stream;
      } catch (err) {
        const msg = getMediaErrorMessage(err);
        setMediaError(msg);
        console.error("[WebRTC] Audio-only failed:", err);
        throw new Error(msg);
      }
    }

    throw new Error("Nenhuma mídia solicitada");
  }, [selectedVideoDevice, selectedAudioDevice, enumerateDevices]);

  const testMedia = useCallback(async (): Promise<{ video: boolean; audio: boolean; stream: MediaStream | null; error?: string }> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      await enumerateDevices();
      return { video: true, audio: true, stream };
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        await enumerateDevices();
        return { video: false, audio: true, stream, error: "Câmera indisponível, apenas áudio." };
      } catch (audioErr) {
        return { video: false, audio: false, stream: null, error: getMediaErrorMessage(audioErr) };
      }
    }
  }, [enumerateDevices]);

  const stopTestStream = useCallback((stream: MediaStream) => {
    stream.getTracks().forEach(t => t.stop());
  }, []);

  // Switch device mid-call
  const switchDevice = useCallback(async (kind: "video" | "audio", deviceId: string) => {
    if (kind === "video") setSelectedVideoDevice(deviceId);
    else setSelectedAudioDevice(deviceId);

    if (!localStreamRef.current || !pcRef.current) return;

    try {
      if (kind === "video") {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const newTrack = newStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(newTrack);

        // Replace track in local stream
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current.addTrack(newTrack);
        originalVideoTrackRef.current = newTrack;
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      } else {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId }, ...AUDIO_CONSTRAINTS },
        });
        const newTrack = newStream.getAudioTracks()[0];
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === "audio");
        if (sender) await sender.replaceTrack(newTrack);

        const oldTrack = localStreamRef.current.getAudioTracks()[0];
        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current.addTrack(newTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    } catch (e) {
      console.error(`[WebRTC] Switch ${kind} device error:`, e);
    }
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
    availableDevices,
    selectedVideoDevice,
    selectedAudioDevice,
    connect,
    disconnect,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    switchDevice,
    testMedia,
    stopTestStream,
    enumerateDevices,
  };
}
