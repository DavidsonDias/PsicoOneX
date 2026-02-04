import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon, ArrowRight } from "lucide-react";

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  variant?: "default" | "primary" | "gradient";
  badge?: string;
  className?: string;
}

export function QuickActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  variant = "default",
  badge,
  className,
}: QuickActionCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative w-full p-4 rounded-xl border text-left transition-all duration-300 group overflow-hidden",
        variant === "default" && "bg-card border-border hover:border-primary/50 hover:shadow-md",
        variant === "primary" && "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:shadow-md hover:shadow-primary/10",
        variant === "gradient" && "bg-gradient-to-br from-primary/10 to-background border-primary/30 hover:shadow-lg hover:shadow-primary/20",
        className
      )}
    >
      {/* Background glow effect */}
      {variant === "gradient" && (
        <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
      )}

      <div className="relative z-10 flex items-start gap-4">
        <div className={cn(
          "p-3 rounded-xl transition-colors shrink-0",
          variant === "default" && "bg-muted group-hover:bg-primary/10",
          variant === "primary" && "bg-primary/10 group-hover:bg-primary/20",
          variant === "gradient" && "bg-primary/10"
        )}>
          <Icon className={cn(
            "w-5 h-5 transition-colors",
            variant === "default" && "text-muted-foreground group-hover:text-primary",
            (variant === "primary" || variant === "gradient") && "text-primary"
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{title}</h3>
            {badge && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary text-primary-foreground">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
      </div>
    </motion.button>
  );
}
