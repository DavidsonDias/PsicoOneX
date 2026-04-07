import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Puzzle, Brain, Video, Calendar, DollarSign, Zap } from "lucide-react";
import { usePlugins } from "@/hooks/usePlugins";
import type { PluginManifest } from "@/lib/plugins/registry";

const categoryIcons: Record<PluginManifest["category"], typeof Brain> = {
  clinical: Brain,
  financial: DollarSign,
  communication: Video,
  analytics: Zap,
  integration: Calendar,
};

const categoryLabels: Record<PluginManifest["category"], string> = {
  clinical: "Clínico",
  financial: "Financeiro",
  communication: "Comunicação",
  analytics: "Análise",
  integration: "Integração",
};

export function PluginManager() {
  const { plugins, togglePlugin } = usePlugins();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="h-5 w-5 text-primary" />
          Módulos & Plugins
        </CardTitle>
        <CardDescription>
          Gerencie os módulos ativos do sistema. Desative o que não usa para simplificar a interface.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {plugins.map((plugin, i) => {
          const Icon = categoryIcons[plugin.category] || Puzzle;
          return (
            <motion.div
              key={plugin.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{plugin.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      v{plugin.version}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {categoryLabels[plugin.category]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{plugin.description}</p>
                </div>
              </div>
              <Switch
                checked={plugin.enabled}
                onCheckedChange={() => togglePlugin(plugin.id)}
              />
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
