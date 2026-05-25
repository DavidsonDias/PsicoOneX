import { useEffect, useState, useCallback } from "react";
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

export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const { data } = await supabase
        .from("user_preferences" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setPrefs({
          theme: d.theme || "system",
          primary_hue: d.primary_hue ?? 217,
          dashboard_layout: d.dashboard_layout || { widgets: DEFAULT_WIDGETS },
          settings: { ...DEFAULTS.settings, ...(d.settings || {}) },
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = useCallback(async (patch: Partial<UserPreferences>) => {
    if (!userId) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await supabase.from("user_preferences" as any).upsert({
      user_id: userId,
      theme: next.theme,
      primary_hue: next.primary_hue,
      dashboard_layout: next.dashboard_layout,
      settings: next.settings,
    } as any);
  }, [prefs, userId]);

  return { prefs, loading, save };
}
