import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardWidget {
  id: string;
  visible: boolean;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system" | "midnight";
  primary_hue: number;
  dashboard_layout: { widgets: DashboardWidget[] };
  settings: {
    session_duration: number;
    session_price: number;
    reminder_hours: number;
    enable_email: boolean;
    enable_whatsapp: boolean;
    enable_sms: boolean;
    terms_of_service: string;
    privacy_policy: string;
  };
}

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: "metrics", visible: true },
  { id: "revenue", visible: true },
  { id: "today", visible: true },
  { id: "quick", visible: true },
  { id: "insights", visible: true },
  { id: "automation", visible: true },
  { id: "weekly", visible: true },
];

const DEFAULTS: UserPreferences = {
  theme: "system",
  primary_hue: 217,
  dashboard_layout: { widgets: DEFAULT_WIDGETS },
  settings: {
    session_duration: 50,
    session_price: 0,
    reminder_hours: 24,
    enable_email: true,
    enable_whatsapp: false,
    enable_sms: false,
    terms_of_service: "",
    privacy_policy: "",
  },
};

// --- Shared singleton store so theme/hue/layout changes propagate everywhere ---
let _state: UserPreferences = DEFAULTS;
let _userId: string | null = null;
let _loading = true;
let _hydrated = false;
const _listeners = new Set<() => void>();

const emit = () => _listeners.forEach((l) => l());

const hydrate = async () => {
  if (_hydrated) return;
  _hydrated = true;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    _loading = false;
    emit();
    return;
  }
  _userId = user.id;
  const { data } = await supabase
    .from("user_preferences" as any)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (data) {
    const d = data as any;
    _state = {
      theme: d.theme || "system",
      primary_hue: d.primary_hue ?? 217,
      dashboard_layout: d.dashboard_layout || { widgets: DEFAULT_WIDGETS },
      settings: { ...DEFAULTS.settings, ...(d.settings || {}) },
    };
  }
  _loading = false;
  emit();
};

const saveStore = async (patch: Partial<UserPreferences>) => {
  _state = { ..._state, ...patch };
  emit();
  if (!_userId) return;
  await supabase.from("user_preferences" as any).upsert(
    {
      user_id: _userId,
      theme: _state.theme,
      primary_hue: _state.primary_hue,
      dashboard_layout: _state.dashboard_layout,
      settings: _state.settings,
    } as any,
    { onConflict: "user_id" } as any
  );
};

const subscribe = (cb: () => void) => {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
};

export function useUserPreferences() {
  useEffect(() => { hydrate(); }, []);
  const snapshot = useSyncExternalStore(subscribe, () => _state, () => _state);
  const save = useCallback((patch: Partial<UserPreferences>) => saveStore(patch), []);
  return { prefs: snapshot, loading: _loading, save };
}
