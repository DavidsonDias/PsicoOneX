import { useEffect, useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Enterprise preferences architecture
 * ----------------------------------------------------------------------
 * APPEARANCE (local per device) — feels like Notion / Linear / Slack
 *   theme, primary_hue, density, radius, glow, sidebar_style,
 *   dashboard_layout
 *
 * SETTINGS (global, follows the user) — clinical / business
 *   session_duration, session_price, reminders, notifications, policies
 */

export type ThemeName =
  | "light"
  | "dark"
  | "system"
  | "midnight"
  | "arctic"
  | "obsidian"
  | "emerald"
  | "crimson"
  | "neopurple";

export type Density = "compact" | "comfortable" | "spacious";
export type Radius = "sharp" | "medium" | "rounded" | "ultra";
export type Glow = "off" | "soft" | "medium" | "strong";
export type SidebarStyle = "solid" | "glass" | "floating" | "minimal";

export const THEME_NAMES: ThemeName[] = [
  "light", "dark", "system", "midnight", "arctic", "obsidian", "emerald", "crimson", "neopurple",
];

export interface DashboardWidget {
  id: string;
  visible: boolean;
}

export interface UserPreferences {
  // Local appearance
  theme: ThemeName;
  primary_hue: number;
  density: Density;
  radius: Radius;
  glow: Glow;
  sidebar_style: SidebarStyle;
  dashboard_layout: { widgets: DashboardWidget[] };
  // Cloud settings
  settings: {
    session_duration: number;
    session_price: number;
    reminder_hours: number;
    enable_email: boolean;
    enable_whatsapp: boolean;
    enable_sms: boolean;
    terms_of_service: string;
    privacy_policy: string;
    /** Minutos antes da sessão para disparar lembretes ao paciente. Ex.: [1440,180,120,60,30,15] */
    reminder_minutes?: number[];
    /** Eventos que disparam e-mail ao paciente */
    email_events?: {
      on_create?: boolean;
      on_reschedule?: boolean;
      on_cancel?: boolean;
      on_onboarding_complete?: boolean;
      on_access_share?: boolean;
    };
    /** Eventos que disparam notificação interna ao psicólogo */
    psychologist_alerts?: {
      on_create?: boolean;
      on_reschedule?: boolean;
      on_cancel?: boolean;
      on_onboarding_complete?: boolean;
      on_financial?: boolean;
      bcc_self_on_patient_emails?: boolean;
    };
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
  density: "comfortable",
  radius: "rounded",
  glow: "soft",
  sidebar_style: "solid",
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
    reminder_minutes: [1440, 180, 60, 15],
    email_events: {
      on_create: true,
      on_reschedule: true,
      on_cancel: true,
      on_onboarding_complete: true,
      on_access_share: true,
    },
    psychologist_alerts: {
      on_create: true,
      on_reschedule: true,
      on_cancel: true,
      on_onboarding_complete: true,
      on_financial: true,
      bcc_self_on_patient_emails: false,
    },
  },
};

const LOCAL_KEY = "psicoone_local_preferences";

type LocalSlice = Pick<
  UserPreferences,
  "theme" | "primary_hue" | "density" | "radius" | "glow" | "sidebar_style" | "dashboard_layout"
>;

function readLocalAppearance(): LocalSlice {
  if (typeof window === "undefined") {
    return {
      theme: DEFAULTS.theme,
      primary_hue: DEFAULTS.primary_hue,
      density: DEFAULTS.density,
      radius: DEFAULTS.radius,
      glow: DEFAULTS.glow,
      sidebar_style: DEFAULTS.sidebar_style,
      dashboard_layout: DEFAULTS.dashboard_layout,
    };
  }
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const p = raw ? JSON.parse(raw) : {};
    return {
      theme: (p.theme as ThemeName) || DEFAULTS.theme,
      primary_hue: typeof p.primary_hue === "number" ? p.primary_hue : DEFAULTS.primary_hue,
      density: (p.density as Density) || DEFAULTS.density,
      radius: (p.radius as Radius) || DEFAULTS.radius,
      glow: (p.glow as Glow) || DEFAULTS.glow,
      sidebar_style: (p.sidebar_style as SidebarStyle) || DEFAULTS.sidebar_style,
      dashboard_layout: p.dashboard_layout?.widgets ? p.dashboard_layout : DEFAULTS.dashboard_layout,
    };
  } catch {
    return {
      theme: DEFAULTS.theme,
      primary_hue: DEFAULTS.primary_hue,
      density: DEFAULTS.density,
      radius: DEFAULTS.radius,
      glow: DEFAULTS.glow,
      sidebar_style: DEFAULTS.sidebar_style,
      dashboard_layout: DEFAULTS.dashboard_layout,
    };
  }
}

function writeLocalAppearance(state: UserPreferences) {
  if (typeof window === "undefined") return;
  try {
    const slice: LocalSlice = {
      theme: state.theme,
      primary_hue: state.primary_hue,
      density: state.density,
      radius: state.radius,
      glow: state.glow,
      sidebar_style: state.sidebar_style,
      dashboard_layout: state.dashboard_layout,
    };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(slice));
  } catch {
    /* quota errors are non-fatal */
  }
}

const localBoot = readLocalAppearance();
let _state: UserPreferences = { ...DEFAULTS, ...localBoot };
let _userId: string | null = null;
let _loading = true;
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
    _state = { ..._state, settings: { ...DEFAULTS.settings, ...(d.settings || {}) } };
  }
  _loading = false;
  emit();
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== LOCAL_KEY) return;
    _state = { ..._state, ...readLocalAppearance() };
    emit();
  });
}

const LOCAL_KEYS = new Set<keyof UserPreferences>([
  "theme", "primary_hue", "density", "radius", "glow", "sidebar_style", "dashboard_layout",
]);

const saveStore = async (patch: Partial<UserPreferences>) => {
  _state = { ..._state, ...patch };
  if (Object.keys(patch).some((k) => LOCAL_KEYS.has(k as keyof UserPreferences))) {
    writeLocalAppearance(_state);
  }
  if ("settings" in patch && _userId) {
    await supabase.from("user_preferences" as any).upsert(
      { user_id: _userId, settings: _state.settings } as any,
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
  const snapshot = useSyncExternalStore(subscribe, () => _state, () => _state);
  const save = useCallback((patch: Partial<UserPreferences>) => saveStore(patch), []);
  return { prefs: snapshot, loading: _loading, save };
}
