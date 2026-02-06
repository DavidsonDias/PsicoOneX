import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Target, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertCircle
} from "lucide-react";

interface ProjectionData {
  currentMonth: number;
  projectedMonth: number;
  yearToDate: number;
  projectedYear: number;
  avgSessionValue: number;
  monthlyTarget: number;
  trend: "up" | "down" | "stable";
  insights: string[];
}

interface FinancialProjectionsProps {
  data: ProjectionData;
}

export function FinancialProjections({ data }: FinancialProjectionsProps) {
  const progressPercent = Math.min((data.currentMonth / data.monthlyTarget) * 100, 100);
  const isOnTrack = progressPercent >= 75;

  return (
    <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/10 border-green-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Projeções Financeiras
          </div>
          <Badge 
            variant={data.trend === "up" ? "default" : data.trend === "down" ? "destructive" : "secondary"}
            className="gap-1"
          >
            {data.trend === "up" ? (
              <><ArrowUpRight className="h-3 w-3" /> Crescendo</>
            ) : data.trend === "down" ? (
              <><ArrowDownRight className="h-3 w-3" /> Retraindo</>
            ) : (
              "Estável"
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Target Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Meta Mensal
            </span>
            <span className="font-semibold">
              R$ {data.currentMonth.toLocaleString("pt-BR")} / R$ {data.monthlyTarget.toLocaleString("pt-BR")}
            </span>
          </div>
          <Progress 
            value={progressPercent} 
            className={`h-3 ${isOnTrack ? "" : "[&>div]:bg-amber-500"}`}
          />
          <p className="text-xs text-muted-foreground">
            {isOnTrack 
              ? "✅ Você está no caminho certo para atingir a meta!" 
              : "⚠️ Atenção: você precisa aumentar o ritmo para atingir a meta"}
          </p>
        </div>

        {/* Projections Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-background/50 border border-border"
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Projeção Mês</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              R$ {data.projectedMonth.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado no ritmo atual
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-lg bg-background/50 border border-border"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Projeção Ano</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              R$ {data.projectedYear.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Acumulado + projeção
            </p>
          </motion.div>
        </div>

        {/* Average Session Value */}
        <div className="p-3 rounded-lg bg-background/50 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ticket Médio por Sessão</span>
            <span className="text-lg font-bold">
              R$ {data.avgSessionValue.toLocaleString("pt-BR")}
            </span>
          </div>
        </div>

        {/* AI Insights */}
        {data.insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Insights da IA
            </p>
            <div className="space-y-2">
              {data.insights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm"
                >
                  {insight}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
