import { useState } from "react";
import { motion } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevenueChartProps {
  data: Array<{
    name: string;
    receitas: number;
    despesas: number;
  }>;
}

type ChartType = "area" | "bar";
type Period = "week" | "month" | "year";

export function RevenueChart({ data }: RevenueChartProps) {
  const [chartType, setChartType] = useState<ChartType>("area");
  const [period, setPeriod] = useState<Period>("month");

  const totalReceitas = data.reduce((sum, item) => sum + item.receitas, 0);
  const totalDespesas = data.reduce((sum, item) => sum + item.despesas, 0);
  const balance = totalReceitas - totalDespesas;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">
                R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Visão Financeira
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex bg-muted rounded-lg p-1">
              {(["week", "month", "year"] as Period[]).map((p) => (
                <Button
                  key={p}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-3 text-xs",
                    period === p && "bg-background shadow-sm"
                  )}
                  onClick={() => setPeriod(p)}
                >
                  {p === "week" ? "7D" : p === "month" ? "30D" : "1A"}
                </Button>
              ))}
            </div>
            
            {/* Chart type toggle */}
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", chartType === "area" && "bg-background shadow-sm")}
                onClick={() => setChartType("area")}
              >
                <TrendingUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", chartType === "bar" && "bg-background shadow-sm")}
                onClick={() => setChartType("bar")}
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="text-lg font-bold text-green-500">
              R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-muted-foreground">Despesas</p>
            <p className="text-lg font-bold text-red-500">
              R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className={cn(
            "p-3 rounded-lg border",
            balance >= 0 
              ? "bg-primary/10 border-primary/20" 
              : "bg-amber-500/10 border-amber-500/20"
          )}>
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={cn(
              "text-lg font-bold",
              balance >= 0 ? "text-primary" : "text-amber-500"
            )}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <motion.div
          key={chartType}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="h-[280px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="receitas"
                  name="Receitas"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReceitas)"
                />
                <Area
                  type="monotone"
                  dataKey="despesas"
                  name="Despesas"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDespesas)"
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="receitas" 
                  name="Receitas" 
                  fill="#22c55e" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="despesas" 
                  name="Despesas" 
                  fill="#ef4444" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  );
}
