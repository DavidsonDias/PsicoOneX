import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const CUSTOM_THEMES = ["midnight", "arctic", "obsidian", "emerald", "crimson", "neopurple"];
const ALL_THEME_CLASSES = ["light", "dark", ...CUSTOM_THEMES];

/**
 * Applies the user's full visual preference stack to the document root.
 * - Theme class (light/dark/custom)
 * - Primary hue
 * - data-density / data-radius / data-glow / data-sidebar-style
 */
export function ThemeApplier() {
  const { setTheme, resolvedTheme } = useTheme();
  const { prefs, loading } = useUserPreferences();

  useEffect(() => {
    if (loading) return;
    const root = document.documentElement;

    // Theme — use next-themes for light/dark/system, manual class for custom
    if (CUSTOM_THEMES.includes(prefs.theme)) {
      // Strip next-themes classes and apply our own
      root.classList.remove(...ALL_THEME_CLASSES);
      root.classList.add(prefs.theme);
      // Tell next-themes we're using a custom one (still tracks state)
      setTheme(prefs.theme);
    } else {
      root.classList.remove(...CUSTOM_THEMES);
      setTheme(prefs.theme);
    }

    // Primary hue
    const hue = prefs.primary_hue;
    root.style.setProperty("--primary", `${hue} 91% 60%`);
    root.style.setProperty("--primary-light", `${hue} 91% 70%`);
    root.style.setProperty("--primary-dark", `${hue} 91% 50%`);
    root.style.setProperty("--ring", `${hue} 91% 60%`);

    // Density / Radius / Glow / Sidebar style
    root.dataset.density = prefs.density;
    root.dataset.radius = prefs.radius;
    root.dataset.glow = prefs.glow;
    root.dataset.sidebarStyle = prefs.sidebar_style;
  }, [
    prefs.theme,
    prefs.primary_hue,
    prefs.density,
    prefs.radius,
    prefs.glow,
    prefs.sidebar_style,
    loading,
    setTheme,
    resolvedTheme,
  ]);

  return null;
}
