import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Users, UserX,
  Calendar, DollarSign, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StrategicMetrics as Metrics } from "@/hooks/useProactiveInsights";

interface Props {
  metrics: Metrics | null;
  isLoading: boolean;
}

interface MetricItem {
  label: string;
  value: string;
  icon: React.ElementType;
  change?: number;
  color: string;
  iconColor: string;
}

export function StrategicMetrics({ metrics, isLoading }: Props) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-10 w-10 rounded-xl mb-3" />
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const items: MetricItem[] = [
    {
      label: "Receita Prevista",
      value: `R$ ${metrics.predictedRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: "from-green-500/20 to-green-500/5 border-green-500/20",
      iconColor: "text-green-500",
    },
    {
      label: "Taxa Comparecimento",
      value: `${metrics.attendanceRate.toFixed(0)}%`,
      icon: metrics.attendanceRate >= 80 ? CheckCircle2 : AlertTriangle,
      color: metrics.attendanceRate >= 80
        ? "from-blue-500/20 to-blue-500/5 border-blue-500/20"
        : "from-amber-500/20 to-amber-500/5 border-amber-500/20",
      iconColor: metrics.attendanceRate >= 80 ? "text-blue-500" : "text-amber-500",
    },
    {
      label: "Pacientes Ativos",
      value: `${metrics.activePatients}`,
      icon: Users,
      color: "from-purple-500/20 to-purple-500/5 border-purple-500/20",
      iconColor: "text-purple-500",
      change: metrics.inactiveRiskCount > 0 ? undefined : undefined,
    },
    {
      label: "Risco Abandono",
      value: `${metrics.inactiveRiskCount}`,
      icon: metrics.inactiveRiskCount > 0 ? UserX : CheckCircle2,
      color: metrics.inactiveRiskCount > 0
        ? "from-red-500/20 to-red-500/5 border-red-500/20"
        : "from-green-500/20 to-green-500/5 border-green-500/20",
      iconColor: metrics.inactiveRiskCount > 0 ? "text-red-500" : "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08 }}
        >
          <Card className={cn("overflow-hidden border bg-gradient-to-br", item.color)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-xl bg-background/50", item.iconColor)}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className="text-xl sm:text-2xl font-bold tracking-tight">{item.value}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
