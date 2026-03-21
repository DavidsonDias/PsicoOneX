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
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncingRef = useRef(false);

  const processSyncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const items = await getAllSyncQueue();
      if (items.length === 0) {
        syncingRef.current = false;
        return;
      }

      let successCount = 0;

      for (const item of items) {
        try {
          await processItem(item);
          if (item.id !== undefined) await removeSyncItem(item.id);
          successCount++;
        } catch (err) {
          console.error("[OfflineSync] Failed to replay item:", item, err);
          // Stop on first failure to preserve order
          break;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} alteração(ões) sincronizada(s)`);
      }
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Try to flush on mount if already online
    if (navigator.onLine) processSyncQueue();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [processSyncQueue]);

  return { isOnline };
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
