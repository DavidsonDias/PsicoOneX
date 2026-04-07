import { useState, useEffect, useCallback } from "react";
import { pluginRegistry, type PluginManifest } from "@/lib/plugins/registry";

export function usePlugins() {
  const [plugins, setPlugins] = useState<PluginManifest[]>(pluginRegistry.getAll());

  useEffect(() => {
    return pluginRegistry.subscribe(() => {
      setPlugins(pluginRegistry.getAll());
    });
  }, []);

  const togglePlugin = useCallback((id: string) => {
    const plugin = pluginRegistry.get(id);
    if (plugin) {
      plugin.enabled ? pluginRegistry.disable(id) : pluginRegistry.enable(id);
    }
  }, []);

  return {
    plugins,
    enabledPlugins: plugins.filter((p) => p.enabled),
    routes: pluginRegistry.getRoutes(),
    sidebarItems: pluginRegistry.getSidebarItems(),
    dashboardWidgets: pluginRegistry.getDashboardWidgets(),
    togglePlugin,
  };
}
