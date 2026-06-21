import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_path: string | null;
  action_label: string | null;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as AppNotification[]);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let userId: string | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let lastSeenAt: string = new Date().toISOString();

    const showLiveToast = (newNotif: AppNotification) => {
      const isOnboarding = newNotif.type === "patient_onboarding";
      try {
        if (typeof window !== "undefined" && "Audio" in window) {
          const audio = new Audio(
            "data:audio/wav;base64,UklGRl9vAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
          );
          audio.volume = 0.4;
          audio.play().catch(() => {});
        }
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted" &&
          document.visibilityState !== "visible"
        ) {
          const n = new Notification(newNotif.title, {
            body: newNotif.message,
            icon: "/icon-192.png",
            tag: newNotif.type,
          });
          n.onclick = () => {
            window.focus();
            if (newNotif.action_path) window.location.href = newNotif.action_path;
          };
        }
      } catch {}

      toast(newNotif.title, {
        description: newNotif.message,
        duration: isOnboarding ? 12000 : 5000,
        className: isOnboarding ? "border-primary shadow-lg" : undefined,
        action: newNotif.action_path
          ? {
              label: newNotif.action_label || "Abrir",
              onClick: () => {
                window.location.href = newNotif.action_path!;
              },
            }
          : undefined,
      });
    };

    const handleIncoming = (newNotif: AppNotification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev].slice(0, 50);
      });
      setUnreadCount((prev) => prev + 1);
      lastSeenAt = newNotif.created_at;
      showLiveToast(newNotif);
    };

    // Polling fallback — pega qualquer evento perdido pelo realtime (rede instável, sleep, etc)
    const pollNewSince = async () => {
      if (!userId) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .gt("created_at", lastSeenAt)
        .order("created_at", { ascending: true })
        .limit(20);
      if (data && data.length) {
        for (const n of data as AppNotification[]) handleIncoming(n);
      }
    };

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      userId = session.user.id;

      channel = supabase
        .channel(`notifications-realtime-${session.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => handleIncoming(payload.new as AppNotification)
        )
        .subscribe();

      pollTimer = setInterval(pollNewSince, 20000);
      window.addEventListener("focus", pollNewSince);
      document.addEventListener("visibilitychange", pollNewSince);
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener("focus", pollNewSince);
      document.removeEventListener("visibilitychange", pollNewSince);
    };
  }, [loadNotifications]);



  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", session.user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => {
      const wasUnread = notifications.find((n) => n.id === id && !n.read);
      return wasUnread ? prev - 1 : prev;
    });
  };

  const clearAll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("notifications").delete().eq("user_id", session.user.id);
    setNotifications([]);
    setUnreadCount(0);
  };

  const createNotification = async (notif: {
    type: string;
    title: string;
    message: string;
    action_path?: string;
    action_label?: string;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("notifications").insert({
      user_id: session.user.id,
      ...notif,
    });
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    createNotification,
    refresh: loadNotifications,
  };
}
