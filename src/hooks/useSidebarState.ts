import { useState, useEffect, useCallback } from "react";

const SIDEBAR_STATE_KEY = "psicoone-sidebar-collapsed";

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return {
    collapsed,
    setCollapsed,
    toggleCollapsed,
  };
}
