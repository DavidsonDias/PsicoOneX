import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, Clock, Calendar, DollarSign, 
  User, AlertTriangle, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AppNotification } from "@/hooks/useNotifications";

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate: (path: string) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  appointment: Calendar,
  payment: DollarSign,
  patient: User,
  system: Sparkles,
  alert: AlertTriangle,
};

const typeColors: Record<string, string> = {
  appointment: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  payment: "bg-green-500/10 text-green-500 border-green-500/20",
  patient: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  system: "bg-primary/10 text-primary border-primary/20",
  alert: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} novas</Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onMarkAllAsRead} className="text-xs">
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-4 space-y-2">
            <AnimatePresence>
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((notification, index) => {
                  const IconComponent = typeIcons[notification.type] || Bell;
                  const colorClass = typeColors[notification.type] || typeColors.system;
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                        notification.read ? "bg-background border-border" : "bg-primary/5 border-primary/20"
                      )}
                      onClick={() => {
                        if (!notification.read) onMarkAsRead(notification.id);
                        if (notification.action_path) onNavigate(notification.action_path);
                      }}
                    >
                      <div className="flex gap-3">
                        <div className={cn("p-2 rounded-lg border shrink-0", colorClass)}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm">{notification.title}</h4>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                            {notification.action_label && (
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                {notification.action_label}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
