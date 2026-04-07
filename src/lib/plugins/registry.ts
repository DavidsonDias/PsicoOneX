import { type ComponentType } from "react";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: "clinical" | "financial" | "communication" | "analytics" | "integration";
  icon?: string;
  enabled: boolean;
  routes?: PluginRoute[];
  sidebarItems?: PluginSidebarItem[];
  dashboardWidgets?: PluginWidget[];
  hooks?: Record<string, (...args: any[]) => void>;
}

export interface PluginRoute {
  path: string;
  component: ComponentType;
  label: string;
}

export interface PluginSidebarItem {
  icon: ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: string;
}

export interface PluginWidget {
  id: string;
  title: string;
  component: ComponentType<any>;
  size: "small" | "medium" | "large";
  position?: number;
}

class PluginRegistry {
  private plugins: Map<string, PluginManifest> = new Map();
  private listeners: Set<() => void> = new Set();

  register(manifest: PluginManifest): void {
    this.plugins.set(manifest.id, manifest);
    this.notify();
  }

  unregister(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.notify();
  }

  enable(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = true;
      this.notify();
    }
  }

  disable(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = false;
      this.notify();
    }
  }

  get(pluginId: string): PluginManifest | undefined {
    return this.plugins.get(pluginId);
  }

  getAll(): PluginManifest[] {
    return Array.from(this.plugins.values());
  }

  getEnabled(): PluginManifest[] {
    return this.getAll().filter((p) => p.enabled);
  }

  getByCategory(category: PluginManifest["category"]): PluginManifest[] {
    return this.getEnabled().filter((p) => p.category === category);
  }

  getRoutes(): PluginRoute[] {
    return this.getEnabled().flatMap((p) => p.routes || []);
  }

  getSidebarItems(): PluginSidebarItem[] {
    return this.getEnabled().flatMap((p) => p.sidebarItems || []);
  }

  getDashboardWidgets(): PluginWidget[] {
    return this.getEnabled()
      .flatMap((p) => p.dashboardWidgets || [])
      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export const pluginRegistry = new PluginRegistry();

// Register built-in modules as plugins
pluginRegistry.register({
  id: "core-telehealth",
  name: "Teleatendimento",
  version: "1.0.0",
  description: "Sessões de teleatendimento com WebRTC, IA e chat",
  author: "SevenDevX",
  category: "clinical",
  enabled: true,
});

pluginRegistry.register({
  id: "core-ai-assistant",
  name: "Assistente IA",
  version: "1.0.0",
  description: "Assistente clínico com IA proativa e geração de conteúdo",
  author: "SevenDevX",
  category: "clinical",
  enabled: true,
});

pluginRegistry.register({
  id: "core-google-calendar",
  name: "Google Calendar",
  version: "1.0.0",
  description: "Sincronização bidirecional com Google Agenda",
  author: "SevenDevX",
  category: "integration",
  enabled: true,
});

pluginRegistry.register({
  id: "core-automation",
  name: "Automações",
  version: "1.0.0",
  description: "Motor de regras para automação de tarefas clínicas",
  author: "SevenDevX",
  category: "analytics",
  enabled: true,
});

pluginRegistry.register({
  id: "core-financial",
  name: "PsicoBank",
  version: "1.0.0",
  description: "Gestão financeira com previsões e inadimplência",
  author: "SevenDevX",
  category: "financial",
  enabled: true,
});
