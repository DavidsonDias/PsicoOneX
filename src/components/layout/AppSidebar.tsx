import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Users,
  Calendar,
  FileText,
  DollarSign,
  LayoutDashboard,
  Heart,
  BarChart3,
  Video,
  Receipt,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Bell,
  Search,
  LogOut,
  MessageSquare,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSidebar } from "@/contexts/SidebarContext";
import { useSubscription } from "@/hooks/useSubscription";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Pacientes", path: "/pacientes" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: FileText, label: "Prontuários", path: "/prontuarios" },
  { icon: ClipboardList, label: "Escalas Psicológicas", path: "/escalas", badge: "Novo" },
  { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
  { icon: Receipt, label: "Documentos", path: "/documentos" },
];

const secondaryNavItems: NavItem[] = [
  { icon: Heart, label: "Portal do Paciente", path: "/portal-paciente" },
  { icon: Video, label: "Teleatendimento", path: "/teleatendimento" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
  { icon: MessageSquare, label: "Assistente IA", path: "/assistente-ia", badge: "IA" },
  { icon: Trash2, label: "Lixeira", path: "/lixeira" },
  { icon: Shield, label: "Usuários", path: "/admin/usuarios", adminOnly: true },
  { icon: Shield, label: "Super Admin", path: "/super-admin", superAdminOnly: true },
];

interface AppSidebarProps {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onOpenCommandPalette?: () => void;
  notifications?: number;
}

export function AppSidebar({ isAdmin, isSuperAdmin, onOpenCommandPalette, notifications = 0 }: AppSidebarProps) {
  const { collapsed, toggleCollapsed } = useSidebar();
  const { planLabel, isTrial, trialDaysRemaining, isExpired } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/");
  };

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    if (item.adminOnly && !isAdmin) return null;
    if (item.superAdminOnly && !isSuperAdmin) return null;
    
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    const content = (
      <motion.div
        whileHover={{ x: collapsed ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          variant="ghost"
          onClick={() => navigate(item.path)}
          className={cn(
            "w-full justify-start gap-3 h-11 px-3 transition-all duration-200",
            isActive 
              ? "bg-primary/10 text-primary hover:bg-primary/15 border-l-2 border-primary" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
            collapsed && "justify-center px-2"
          )}
        >
          <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="truncate text-sm font-medium"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
          {!collapsed && item.badge && (
            <Badge 
              variant={item.badge === "IA" ? "default" : "secondary"} 
              className={cn(
                "ml-auto text-xs py-0 px-1.5",
                item.badge === "IA" && "bg-gradient-primary"
              )}
            >
              {item.badge}
            </Badge>
          )}
        </Button>
      </motion.div>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.badge && (
              <Badge variant="secondary" className="text-xs py-0 px-1">
                {item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-0 z-40 hidden lg:flex h-screen flex-col border-r border-border bg-card"
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-md">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col"
              >
                <span className="font-bold text-lg text-gradient-primary">
                  PsicoOne
                </span>
                <span className="text-[10px] text-muted-foreground -mt-0.5">Enterprise</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Search Button */}
      {!collapsed && (
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-muted-foreground h-10"
            onClick={onOpenCommandPalette}
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Buscar...</span>
            <kbd className="ml-auto pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 hidden sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>
      )}

      {collapsed && (
        <div className="p-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-10"
                onClick={onOpenCommandPalette}
              >
                <Search className="h-5 w-5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Buscar (⌘K)</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavItemComponent key={item.path} item={item} />
          ))}
        </div>

        <div className="my-4 mx-3 border-t border-border" />

        <div className="space-y-1">
          {secondaryNavItems.map((item) => (
            <NavItemComponent key={item.path} item={item} />
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border p-2 space-y-1">
        {/* Notifications */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-11 px-3 text-muted-foreground hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              onClick={() => navigate("/notificacoes")}
            >
              <div className="relative">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-white flex items-center justify-center">
                    {notifications > 9 ? "9+" : notifications}
                  </span>
                )}
              </div>
              {!collapsed && <span className="text-sm font-medium">Notificações</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Notificações</TooltipContent>}
        </Tooltip>

        {/* Settings */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-11 px-3 text-muted-foreground hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              onClick={() => navigate("/configuracoes")}
            >
              <Settings className="h-5 w-5" />
              {!collapsed && <span className="text-sm font-medium">Configurações</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Configurações</TooltipContent>}
        </Tooltip>

        {/* Plan Status */}
        {!collapsed && (
          <div className={cn(
            "px-3 py-2 rounded-lg text-xs",
            isExpired ? "bg-destructive/10 text-destructive" : isTrial ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"
          )}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-medium">Plano {planLabel}</span>
            </div>
            {isTrial && (
              <p className="text-[10px] mt-0.5 opacity-80">{trialDaysRemaining} dias restantes</p>
            )}
            {isExpired && (
              <p className="text-[10px] mt-0.5 opacity-80">Expirado — Ative um plano</p>
            )}
          </div>
        )}

        {/* Sign Out */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-11 px-3 text-muted-foreground hover:text-destructive",
                collapsed && "justify-center px-2"
              )}
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span className="text-sm font-medium">Sair</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Sair</TooltipContent>}
        </Tooltip>

        {/* Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          className="w-full h-9 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
}
