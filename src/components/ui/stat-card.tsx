import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: number | string;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "blue" | "purple" | "green" | "amber" | "red";
  delay?: number;
}

const variantStyles = {
  blue: "bg-blue-500/10 text-blue-500",
  purple: "bg-purple-500/10 text-purple-500",
  green: "bg-green-500/10 text-green-500",
  amber: "bg-amber-500/10 text-amber-500",
  red: "bg-red-500/10 text-red-500",
};

export function StatCard({ 
  icon: Icon, 
  title, 
  value, 
  description, 
  trend,
  variant = "blue",
  delay = 0 
}: StatCardProps) {
  const TrendIcon = trend 
    ? trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus
    : null;
  
  const trendColor = trend
    ? trend.value > 0 ? "text-green-500" : trend.value < 0 ? "text-red-500" : "text-muted-foreground"
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                variantStyles[variant]
              )}
            >
              <Icon className="w-6 h-6" />
            </motion.div>
            {trend && TrendIcon && (
              <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
                <TrendIcon className="w-4 h-4" />
                <span className="font-medium">{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <motion.p 
              className="text-3xl font-bold tracking-tight"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.1 }}
            >
              {value}
            </motion.p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p className="text-xs text-muted-foreground">{trend.label}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
