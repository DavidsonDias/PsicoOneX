import { useEffect, useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Enterprise preferences architecture
 * ------------------------------------------------
 * APPEARANCE (theme, accent hue, dashboard layout, widgets) → LOCAL per device (localStorage)
 *   Behaves like Notion / Slack / Linear: each device keeps its own look & feel.
 *
 * SETTINGS (sessões, lembretes, notificações, políticas) → GLOBAL (Supabase user_preferences)
 *   Business/clinical rules follow the user across devices.
 */

export interface DashboardWidget {
  id: string;
  visible: boolean;
}

export interface UserPreferences {
  // Local (per device)
  theme: "light" | "dark" | "system" | "midnight";
  primary_hue: number;
  dashboard_layout: { widgets: DashboardWidget[] };
  // Global (cloud)
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

const LOCAL_KEY = "psicoone_local_preferences";

// ---------- Local appearance bootstrap (synchronous, no flash) ----------
function readLocalAppearance(): Pick<UserPreferences, "theme" | "primary_hue" | "dashboard_layout"> {
  if (typeof window === "undefined") {
    return {
      theme: DEFAULTS.theme,
      primary_hue: DEFAULTS.primary_hue,
      dashboard_layout: DEFAULTS.dashboard_layout,
    };
  }
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) {
      return {
        theme: DEFAULTS.theme,
        primary_hue: DEFAULTS.primary_hue,
        dashboard_layout: DEFAULTS.dashboard_layout,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      theme: parsed.theme || DEFAULTS.theme,
      primary_hue: typeof parsed.primary_hue === "number" ? parsed.primary_hue : DEFAULTS.primary_hue,
      dashboard_layout: parsed.dashboard_layout?.widgets
        ? parsed.dashboard_layout
        : DEFAULTS.dashboard_layout,
    };
  } catch {
    return {
      theme: DEFAULTS.theme,
      primary_hue: DEFAULTS.primary_hue,
      dashboard_layout: DEFAULTS.dashboard_layout,
    };
  }
}

function writeLocalAppearance(state: UserPreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify({
        theme: state.theme,
        primary_hue: state.primary_hue,
        dashboard_layout: state.dashboard_layout,
      })
    );
  } catch {
    /* quota errors are non-fatal */
  }
}

// ---------- Shared singleton store ----------
const localBoot = readLocalAppearance();
let _state: UserPreferences = { ...DEFAULTS, ...localBoot };
let _userId: string | null = null;
let _loading = true; // refers to cloud settings only; appearance is instant
let _hydrated = false;
const _listeners = new Set<() => void>();
const emit = () => _listeners.forEach((l) => l());

const hydrate = async () => {
  if (_hydrated) return;
  _hydrated = true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    _loading = false;
    emit();
    return;
  }
  _userId = user.id;
  const { data } = await supabase
    .from("user_preferences" as any)
    .select("settings")
    .eq("user_id", user.id)
    .maybeSingle();
  if (data) {
    const d = data as any;
    _state = {
      ..._state,
      settings: { ...DEFAULTS.settings, ...(d.settings || {}) },
    };
  }
  _loading = false;
  emit();
};

// Cross-tab sync for local appearance
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== LOCAL_KEY) return;
    const next = readLocalAppearance();
    _state = { ..._state, ...next };
    emit();
  });
}

const saveStore = async (patch: Partial<UserPreferences>) => {
  _state = { ..._state, ...patch };

  // Local (appearance) keys → localStorage only
  if ("theme" in patch || "primary_hue" in patch || "dashboard_layout" in patch) {
    writeLocalAppearance(_state);
  }

  // Cloud (settings) → Supabase
  if ("settings" in patch && _userId) {
    await supabase.from("user_preferences" as any).upsert(
      {
        user_id: _userId,
        settings: _state.settings,
      } as any,
      { onConflict: "user_id" } as any
    );
  }

  emit();
};

const subscribe = (cb: () => void) => {
  _listeners.add(cb);
  return () => {
    _listeners.delete(cb);
  };
};

export function useUserPreferences() {
  useEffect(() => {
    hydrate();
  }, []);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => _state,
    () => _state
  );
  const save = useCallback((patch: Partial<UserPreferences>) => saveStore(patch), []);
  return { prefs: snapshot, loading: _loading, save };
}
