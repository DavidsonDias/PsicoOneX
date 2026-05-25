import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useUserPreferences } from "@/hooks/useUserPreferences";

/**
 * Applies the user's persisted theme + custom primary hue to the document.
 * Reads from user_preferences; falls back to system theme.
 */
export function ThemeApplier() {
  const { setTheme } = useTheme();
  const { prefs, loading } = useUserPreferences();

  useEffect(() => {
    if (loading) return;
    setTheme(prefs.theme);
    const root = document.documentElement;
    const hue = prefs.primary_hue;
    root.style.setProperty("--primary", `${hue} 91% 60%`);
    root.style.setProperty("--primary-light", `${hue} 91% 70%`);
    root.style.setProperty("--primary-dark", `${hue} 91% 50%`);
    root.style.setProperty("--ring", `${hue} 91% 60%`);
  }, [prefs.theme, prefs.primary_hue, loading, setTheme]);

  return null;
}
