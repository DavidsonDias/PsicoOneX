import { createContext, useContext, type ReactNode } from "react";
import { useOfflineSync, type SyncState } from "@/hooks/useOfflineSync";

interface SyncContextValue {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  lastSyncedAt: Date | null;
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: true,
  syncState: "synced",
  pendingCount: 0,
  lastSyncedAt: null,
});

export const useSyncStatus = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: ReactNode }) {
  const value = useOfflineSync();
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
