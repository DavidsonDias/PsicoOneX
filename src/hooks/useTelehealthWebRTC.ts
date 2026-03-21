import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "unstable" | "reconnecting";

interface UseTelehealthWebRTCOptions {
  roomToken: string;
  isHost: boolean; // psychologist = host
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

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const makingOfferRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const updateStatus = useCallback((s: ConnectionStatus) => {
    setConnectionStatus(s);
    onConnectionStatus?.(s);
  }, [onConnectionStatus]);

  const createPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
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
      onRemoteStream?.(event.streams[0]);
    };

    pc.oniceconnectionstatechange = () => {
      switch (pc.iceConnectionState) {
        case "connected":
        case "completed":
          updateStatus("connected");
          break;
        case "disconnected":
          updateStatus("unstable");
          break;
        case "failed":
          updateStatus("reconnecting");
          pc.restartIce();
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
        console.error("Negotiation error:", e);
      } finally {
        makingOfferRef.current = false;
      }
    };

    pcRef.current = pc;
    return pc;
  }, [onRemoteStream, updateStatus]);

  const startMedia = useCallback(async (videoOn = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoOn,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      originalVideoTrackRef.current = stream.getVideoTracks()[0] || null;
      return stream;
    } catch (err) {
      // Try audio-only fallback
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setVideoEnabled(false);
      return stream;
    }
  }, []);

  const connect = useCallback(async () => {
    updateStatus("connecting");

    const stream = await startMedia();
    const pc = createPeerConnection();

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Set up Supabase Realtime channel for signaling
    const channel = supabase.channel(`telehealth:${roomToken}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "sdp" }, async ({ payload }) => {
        const { description } = payload;
        if (!description || !pcRef.current) return;

        const pc = pcRef.current;
        const offerCollision = description.type === "offer" && (makingOfferRef.current || pc.signalingState !== "stable");

        if (offerCollision && isHost) return; // host is polite

        try {
          await pc.setRemoteDescription(description);
          // Flush pending candidates
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
          console.error("SDP handling error:", e);
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
          console.error("ICE candidate error:", e);
        }
      })
      .on("broadcast", { event: "peer-joined" }, async () => {
        // When a peer joins, the host creates the offer
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
            console.error("Offer creation error:", e);
          }
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Announce presence
          if (!isHost) {
            channel.send({ type: "broadcast", event: "peer-joined", payload: {} });
          }
        }
      });

    channelRef.current = channel;
  }, [roomToken, isHost, startMedia, createPeerConnection, updateStatus]);

  const disconnect = useCallback(() => {
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
      console.error("Screen share error:", e);
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
    connect,
    disconnect,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
  };
}
