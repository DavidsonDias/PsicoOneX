import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg" | "xl";
  strokeWidth?: number;
  showValue?: boolean;
  label?: string;
  className?: string;
  variant?: "primary" | "success" | "warning" | "danger";
}

const sizes = {
  sm: 40,
  md: 60,
  lg: 80,
  xl: 120,
};

const variants = {
  primary: "stroke-primary",
  success: "stroke-green-500",
  warning: "stroke-amber-500",
  danger: "stroke-red-500",
};

export function ProgressRing({
  value,
  max = 100,
  size = "md",
  strokeWidth = 4,
  showValue = true,
  label,
  className,
  variant = "primary",
}: ProgressRingProps) {
  const sizeValue = sizes[size];
  const radius = (sizeValue - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value, max);
  const offset = circumference - (progress / max) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={sizeValue} height={sizeValue} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={sizeValue / 2}
          cy={sizeValue / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted"
        />
        {/* Progress circle */}
        <motion.circle
          cx={sizeValue / 2}
          cy={sizeValue / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={cn("fill-none", variants[variant])}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeDasharray={circumference}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "font-bold",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-lg",
            size === "xl" && "text-2xl"
          )}>
            {Math.round(progress)}%
          </span>
          {label && size !== "sm" && (
            <span className="text-[10px] text-muted-foreground">{label}</span>
          )}
        </div>
      )}
    </div>
  );
}
