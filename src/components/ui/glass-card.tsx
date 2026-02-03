import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { forwardRef, ReactNode } from "react";

interface GlassCardProps {
  blur?: "sm" | "md" | "lg" | "xl";
  gradient?: boolean;
  glow?: boolean;
  className?: string;
  children?: ReactNode;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, blur = "lg", gradient = false, glow = false, children }, ref) => {
    const blurClasses = {
      sm: "backdrop-blur-sm",
      md: "backdrop-blur-md",
      lg: "backdrop-blur-lg",
      xl: "backdrop-blur-xl",
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative rounded-2xl border border-border/50 bg-card/80",
          blurClasses[blur],
          gradient && "bg-gradient-card",
          glow && "shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)]",
          className
        )}
      >
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-transparent to-secondary/20 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";
