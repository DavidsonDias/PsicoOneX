import { useState, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical, Settings2, Check, RotateCcw } from "lucide-react";
import { useUserPreferences, DEFAULT_WIDGETS, type DashboardWidget } from "@/hooks/useUserPreferences";
import { toast } from "sonner";

export interface DashboardWidgetDef {
  id: string;
  label: string;
  description: string;
  render: () => React.ReactNode;
}

interface Props {
  widgets: DashboardWidgetDef[];
}

export function CustomizableDashboard({ widgets }: Props) {
  const { prefs, save } = useUserPreferences();
  const [editMode, setEditMode] = useState(false);

  const layout = prefs.dashboard_layout?.widgets?.length
    ? prefs.dashboard_layout.widgets
    : DEFAULT_WIDGETS;

  // Merge: keep saved order, append any new widgets defined in code
  const ordered = useMemo<DashboardWidget[]>(() => {
    const known = new Set(widgets.map((w) => w.id));
    const filtered = layout.filter((w) => known.has(w.id));
    const missing = widgets
      .filter((w) => !filtered.find((l) => l.id === w.id))
      .map((w) => ({ id: w.id, visible: true }));
    return [...filtered, ...missing];
  }, [layout, widgets]);

  const widgetMap = useMemo(
    () => Object.fromEntries(widgets.map((w) => [w.id, w])),
    [widgets]
  );

  const persist = (next: DashboardWidget[]) => {
    save({ dashboard_layout: { widgets: next } });
  };

  const toggle = (id: string) => {
    const next = ordered.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    persist(next);
  };

  const reset = () => {
    persist(DEFAULT_WIDGETS);
    toast.success("Layout restaurado ao padrão");
  };

  return (
    <>
      <div className="flex justify-end mb-4 gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" /> Widgets
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm">Personalizar Dashboard</h4>
                <p className="text-xs text-muted-foreground">Mostre ou oculte os blocos abaixo</p>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {widgets.map((w) => {
                  const item = ordered.find((o) => o.id === w.id);
                  return (
                    <label
                      key={w.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{w.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{w.description}</p>
                      </div>
                      <Switch
                        checked={item?.visible ?? true}
                        onCheckedChange={() => toggle(w.id)}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant={editMode ? "default" : "outline"}
                  className="flex-1 gap-1.5"
                  onClick={() => setEditMode((v) => !v)}
                >
                  {editMode ? <Check className="h-3.5 w-3.5" /> : <GripVertical className="h-3.5 w-3.5" />}
                  {editMode ? "Concluir" : "Reordenar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Padrão
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {editMode ? (
        <Reorder.Group
          axis="y"
          values={ordered}
          onReorder={(items) => persist(items)}
          className="space-y-4"
        >
          {ordered.map((w) => {
            const def = widgetMap[w.id];
            if (!def) return null;
            return (
              <Reorder.Item
                key={w.id}
                value={w}
                className="cursor-grab active:cursor-grabbing"
              >
                <Card className="border-dashed border-primary/40 bg-card/50 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {def.label}
                    </CardTitle>
                    <Switch
                      checked={w.visible}
                      onCheckedChange={() => toggle(w.id)}
                    />
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground py-2">
                    {def.description}
                  </CardContent>
                </Card>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {ordered
              .filter((w) => w.visible)
              .map((w, i) => {
                const def = widgetMap[w.id];
                if (!def) return null;
                return (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    {def.render()}
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
