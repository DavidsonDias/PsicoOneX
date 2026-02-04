import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PulseIndicatorProps {
  status: "online" | "away" | "busy" | "offline";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const statusColors = {
  online: "bg-green-500",
  away: "bg-amber-500",
  busy: "bg-red-500",
  offline: "bg-muted-foreground",
};

const statusLabels = {
  online: "Online",
  away: "Ausente",
  busy: "Ocupado",
  offline: "Offline",
};

const sizes = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

export function PulseIndicator({
  status,
  size = "md",
  showLabel = false,
  className,
}: PulseIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div className={cn("rounded-full", sizes[size], statusColors[status])} />
        {status === "online" && (
          <motion.div
            animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className={cn(
              "absolute inset-0 rounded-full",
              statusColors[status]
            )}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          {statusLabels[status]}
        </span>
      )}
    </div>
  );
}
