import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityItem {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  timestamp: Date;
  type: "success" | "warning" | "info" | "default";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
  className?: string;
}

const typeStyles = {
  success: "bg-green-500/10 text-green-500 border-green-500/20",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  default: "bg-muted text-muted-foreground border-border",
};

export function ActivityFeed({ activities, maxItems = 5, className }: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <div className={cn("space-y-3", className)}>
      {displayedActivities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <div className={cn("p-2 rounded-lg border", typeStyles[activity.type])}>
            <activity.icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{activity.title}</p>
            {activity.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {activity.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ptBR })}
            </p>
          </div>
          {activity.action && (
            <button
              onClick={activity.action.onClick}
              className="text-xs text-primary hover:underline shrink-0"
            >
              {activity.action.label}
            </button>
          )}
        </motion.div>
      ))}
      
      {activities.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Nenhuma atividade recente</p>
        </div>
      )}
    </div>
  );
}
