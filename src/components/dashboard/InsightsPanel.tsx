import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, TrendingUp, AlertTriangle, Lightbulb, 
  ChevronRight, RefreshCw, Brain, Target, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Insight {
  id: string;
  type: "success" | "warning" | "tip" | "trend";
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  metric?: string;
}

interface InsightsPanelProps {
  patientsCount: number;
  appointmentsCount: number;
  pendingPayments: number;
  revenue: number;
  onNavigate: (path: string) => void;
}

const typeIcons = {
  success: TrendingUp,
  warning: AlertTriangle,
  tip: Lightbulb,
  trend: Target,
};

const typeStyles = {
  success: "bg-green-500/10 text-green-500 border-green-500/20",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  tip: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  trend: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export function InsightsPanel({
  patientsCount,
  appointmentsCount,
  pendingPayments,
  revenue,
  onNavigate,
}: InsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    generateInsights();
  }, [patientsCount, appointmentsCount, pendingPayments, revenue]);

  const generateInsights = () => {
    const newInsights: Insight[] = [];

    // Analyze data and generate insights
    if (pendingPayments > 0) {
      newInsights.push({
        id: "pending-payments",
        type: "warning",
        title: "Pagamentos pendentes",
        description: `Você tem R$ ${pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em pagamentos pendentes que precisam de atenção.`,
        action: {
          label: "Ver financeiro",
          onClick: () => onNavigate("/financeiro"),
        },
        metric: `R$ ${pendingPayments.toFixed(0)}`,
      });
    }

    if (patientsCount > 0 && appointmentsCount === 0) {
      newInsights.push({
        id: "no-appointments",
        type: "tip",
        title: "Agenda vazia hoje",
        description: "Aproveite para entrar em contato com pacientes que não agendam há tempo.",
        action: {
          label: "Ver pacientes",
          onClick: () => onNavigate("/pacientes"),
        },
      });
    }

    if (revenue > 0) {
      const avgPerPatient = patientsCount > 0 ? revenue / patientsCount : 0;
      newInsights.push({
        id: "revenue-insight",
        type: "success",
        title: "Performance financeira",
        description: `Receita média por paciente: R$ ${avgPerPatient.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        metric: `+${((revenue / 10000) * 100).toFixed(0)}%`,
      });
    }

    newInsights.push({
      id: "productivity-tip",
      type: "tip",
      title: "Dica de produtividade",
      description: "Use o comando ⌘K para navegar rapidamente entre as funcionalidades do sistema.",
    });

    if (patientsCount >= 5) {
      newInsights.push({
        id: "growth-trend",
        type: "trend",
        title: "Tendência de crescimento",
        description: `Você tem ${patientsCount} pacientes cadastrados. Continue expandindo sua base!`,
        action: {
          label: "Adicionar paciente",
          onClick: () => onNavigate("/pacientes"),
        },
      });
    }

    setInsights(newInsights);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    generateInsights();
    setIsRefreshing(false);
  };

  const currentInsight = insights[activeIndex];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            Insights IA
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Beta
            </Badge>
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
      <CardContent className="space-y-4">
        {/* Insights carousel */}
        <AnimatePresence mode="wait">
          {currentInsight && (
            <motion.div
              key={currentInsight.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={cn(
                "p-4 rounded-xl border",
                typeStyles[currentInsight.type]
              )}
            >
              <div className="flex items-start gap-3">
                {(() => {
                  const IconComponent = typeIcons[currentInsight.type];
                  return (
                    <div className="p-2 rounded-lg bg-background/50">
                      <IconComponent className="h-4 w-4" />
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm">{currentInsight.title}</h4>
                    {currentInsight.metric && (
                      <span className="text-xs font-bold">{currentInsight.metric}</span>
                    )}
                  </div>
                  <p className="text-xs mt-1 opacity-90">{currentInsight.description}</p>
                  {currentInsight.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 px-2 text-xs gap-1 hover:bg-background/50"
                      onClick={currentInsight.action.onClick}
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

        {/* Navigation dots */}
        {insights.length > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {insights.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === activeIndex
                    ? "bg-primary w-4"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-primary">{patientsCount}</p>
            <p className="text-[10px] text-muted-foreground">Pacientes</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-primary">{appointmentsCount}</p>
            <p className="text-[10px] text-muted-foreground">Sessões</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-green-500">
              {((revenue / (revenue + pendingPayments || 1)) * 100).toFixed(0)}%
            </p>
            <p className="text-[10px] text-muted-foreground">Taxa Pgto</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
