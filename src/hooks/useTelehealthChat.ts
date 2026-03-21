import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  sender: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export function useTelehealthChat(roomToken: string, senderName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`telehealth-chat:${roomToken}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "chat-message" }, ({ payload }) => {
        const msg = payload as ChatMessage;
        setMessages((prev) => [...prev, msg]);
        if (!isOpen) setUnreadCount((c) => c + 1);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomToken, isOpen]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !channelRef.current) return;

      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "self",
        senderName,
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };

      // Add locally
      setMessages((prev) => [...prev, { ...msg, sender: "self" }]);

      // Broadcast
      channelRef.current.send({
        type: "broadcast",
        event: "chat-message",
        payload: { ...msg, sender: "remote" },
      });
    },
    [senderName]
  );

  const openChat = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { messages, sendMessage, unreadCount, isOpen, openChat, closeChat };
}
