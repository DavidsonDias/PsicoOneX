import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sun, 
  Moon, 
  Coffee, 
  Clock, 
  Users, 
  TrendingUp,
  Zap
} from "lucide-react";

interface DayStats {
  totalSlots: number;
  bookedSlots: number;
  confirmedSlots: number;
  completedSlots: number;
  cancelledSlots: number;
  revenue: number;
  avgDuration: number;
}

interface DayOverviewProps {
  stats: DayStats;
  selectedDate: Date;
}

export function DayOverview({ stats, selectedDate }: DayOverviewProps) {
  const occupancyRate = stats.totalSlots > 0 
    ? Math.round((stats.bookedSlots / stats.totalSlots) * 100) 
    : 0;

  const isToday = new Date().toDateString() === selectedDate.toDateString();
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  const timeConfig = {
    morning: { icon: Sun, label: "Bom dia", color: "text-amber-500" },
    afternoon: { icon: Coffee, label: "Boa tarde", color: "text-orange-500" },
    evening: { icon: Moon, label: "Boa noite", color: "text-indigo-500" },
  };

  const TimeIcon = timeConfig[timeOfDay].icon;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Resumo do Dia
          </div>
          {isToday && (
            <Badge variant="secondary" className="gap-1">
              <TimeIcon className={`h-3 w-3 ${timeConfig[timeOfDay].color}`} />
              Hoje
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Occupancy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Taxa de Ocupação</span>
            <span className="font-semibold">{occupancyRate}%</span>
          </div>
          <Progress value={occupancyRate} className="h-2" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-background/50 border border-border"
          >
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Agendados</span>
            </div>
            <p className="text-2xl font-bold">{stats.bookedSlots}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-3 rounded-lg bg-background/50 border border-border"
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Confirmados</span>
            </div>
            <p className="text-2xl font-bold">{stats.confirmedSlots}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 rounded-lg bg-background/50 border border-border"
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Realizados</span>
            </div>
            <p className="text-2xl font-bold">{stats.completedSlots}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-3 rounded-lg bg-background/50 border border-border"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">Receita Est.</span>
            </div>
            <p className="text-lg font-bold text-green-600">
              R$ {stats.revenue.toLocaleString("pt-BR")}
            </p>
          </motion.div>
        </div>

        {/* Productivity Tip */}
        {stats.bookedSlots === 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              💡 Dia livre! Que tal revisar prontuários pendentes ou contatar pacientes inativos?
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
