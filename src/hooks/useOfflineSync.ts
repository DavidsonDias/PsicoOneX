import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getAllSyncQueue,
  removeSyncItem,
  type SyncQueueItem,
} from "@/lib/offline-store";
import { toast } from "sonner";

/**
 * Watches for network reconnection and replays queued offline writes.
 * Mount once at the app level.
 */
export type SyncState = "synced" | "syncing" | "offline" | "error";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncState, setSyncState] = useState<SyncState>(navigator.onLine ? "synced" : "offline");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const syncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const items = await getAllSyncQueue();
      setPendingCount(items.length);
    } catch {
      // ignore
    }
  }, []);

  const processSyncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const items = await getAllSyncQueue();
      setPendingCount(items.length);
      if (items.length === 0) {
        setSyncState("synced");
        syncingRef.current = false;
        return;
      }

      setSyncState("syncing");
      let successCount = 0;

      for (const item of items) {
        try {
          await processItem(item);
          if (item.id !== undefined) await removeSyncItem(item.id);
          successCount++;
        } catch (err) {
          console.error("[OfflineSync] Failed to replay item:", item, err);
          setSyncState("error");
          break;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} alteração(ões) sincronizada(s)`);
        setLastSyncedAt(new Date());
      }

      const remaining = await getAllSyncQueue();
      setPendingCount(remaining.length);
      if (remaining.length === 0) setSyncState("synced");
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processSyncQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncState("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) processSyncQueue();
    else refreshPendingCount();

    // Poll pending count every 10s
    const interval = setInterval(refreshPendingCount, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [processSyncQueue, refreshPendingCount]);

  return { isOnline, syncState, pendingCount, lastSyncedAt };
}

async function processItem(item: SyncQueueItem) {
  const { table, operation, payload } = item;

  switch (operation) {
    case "insert": {
      const { error } = await supabase.from(table as any).insert(payload as any);
      if (error) throw error;
      break;
    }
    case "update": {
      const { id, ...rest } = payload;
      const { error } = await supabase.from(table as any).update(rest as any).eq("id", id);
      if (error) throw error;
      break;
    }
    case "delete": {
      const { error } = await supabase.from(table as any).delete().eq("id", payload.id);
      if (error) throw error;
      break;
    }
  }
}
