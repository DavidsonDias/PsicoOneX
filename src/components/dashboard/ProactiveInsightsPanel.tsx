import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, TrendingUp, Brain, Target, Info,
  AlertCircle, ChevronRight, RefreshCw, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ProactiveInsight } from "@/hooks/useProactiveInsights";
import { useState } from "react";

interface Props {
  insights: ProactiveInsight[];
  isLoading: boolean;
  onRefresh: (useAI?: boolean) => void;
  onNavigate: (path: string) => void;
}

const typeIcons = {
  success: TrendingUp,
  warning: AlertTriangle,
  critical: AlertCircle,
  trend: Target,
  info: Info,
  ai: Brain,
};

const typeStyles = {
  success: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  trend: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  ai: "bg-gradient-to-br from-primary/10 to-purple-500/10 text-primary border-primary/20",
};

export function ProactiveInsightsPanel({ insights, isLoading, onRefresh, onNavigate }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Atualização normal: apenas dados calculados, sem consumir IA.
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh(false);
    setIsRefreshing(false);
  };

  // Ação explícita do profissional: só aqui a IA é acionada.
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    await onRefresh(true);
    setIsAnalyzing(false);
  };

  const currentInsight = insights[activeIndex];
  const highPriority = insights.filter(i => i.priority === "high").length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            IA Proativa
            {highPriority > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {highPriority} alerta{highPriority > 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence mode="wait">
          {currentInsight && (
            <motion.div
              key={currentInsight.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={cn("p-4 rounded-xl border", typeStyles[currentInsight.type])}
            >
              <div className="flex items-start gap-3">
                {(() => {
                  const Icon = typeIcons[currentInsight.type];
                  return (
                    <div className="p-2 rounded-lg bg-background/50 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm">{currentInsight.title}</h4>
                    {currentInsight.metric && (
                      <span className="text-xs font-bold whitespace-nowrap">{currentInsight.metric}</span>
                    )}
                  </div>
                  <p className="text-xs mt-1 opacity-90 leading-relaxed">{currentInsight.description}</p>
                  {currentInsight.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 px-2 text-xs gap-1 hover:bg-background/50"
                      onClick={() => onNavigate(currentInsight.action!.path)}
                    >
                      {currentInsight.action.label}
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {insights.length > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {insights.map((insight, index) => (
              <button
                key={insight.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === activeIndex
                    ? "bg-primary w-4"
                    : insight.priority === "high"
                    ? "bg-destructive/50 w-2 hover:bg-destructive/70"
                    : "bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        )}

        {insights.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum insight no momento</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
