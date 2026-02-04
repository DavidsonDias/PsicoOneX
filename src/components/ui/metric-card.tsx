import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: number;
    period: string;
  };
  sparkline?: number[];
  className?: string;
  variant?: "default" | "gradient" | "outlined";
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  change,
  sparkline,
  className,
  variant = "default",
}: MetricCardProps) {
  const isPositive = change && change.value > 0;
  const isNegative = change && change.value < 0;
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  // Calculate sparkline path
  const getSparklinePath = () => {
    if (!sparkline || sparkline.length === 0) return "";
    const max = Math.max(...sparkline);
    const min = Math.min(...sparkline);
    const range = max - min || 1;
    const width = 80;
    const height = 30;
    const stepX = width / (sparkline.length - 1);
    
    return sparkline
      .map((val, i) => {
        const x = i * stepX;
        const y = height - ((val - min) / range) * height;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "relative overflow-hidden rounded-xl p-5 transition-shadow duration-300",
        variant === "default" && "bg-card border border-border hover:shadow-lg",
        variant === "gradient" && "bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 hover:shadow-lg hover:shadow-primary/10",
        variant === "outlined" && "bg-background border-2 border-border hover:border-primary/50",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-8 -top-8 opacity-5">
        <Icon className="w-32 h-32" />
      </div>

      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg",
              variant === "gradient" ? "bg-primary/10" : "bg-muted"
            )}>
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            
            {change && (
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded",
                  isPositive && "bg-green-500/10 text-green-500",
                  isNegative && "bg-red-500/10 text-red-500",
                  !isPositive && !isNegative && "bg-muted text-muted-foreground"
                )}>
                  <TrendIcon className="w-3 h-3" />
                  <span>{Math.abs(change.value)}%</span>
                </div>
                <span className="text-xs text-muted-foreground">{change.period}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sparkline */}
        {sparkline && sparkline.length > 0 && (
          <div className="self-end">
            <svg width="80" height="30" className="overflow-visible">
              <defs>
                <linearGradient id={`sparkGradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Area fill */}
              <motion.path
                d={`${getSparklinePath()} L 80 30 L 0 30 Z`}
                fill={`url(#sparkGradient-${title})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              />
              {/* Line */}
              <motion.path
                d={getSparklinePath()}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
          </div>
        )}
      </div>
    </motion.div>
  );
}
