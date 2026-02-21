import { Brain, Menu, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
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
  ClipboardList,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface MobileHeaderProps {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onOpenSearch?: () => void;
  notifications?: number;
}

const mainNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Pacientes", path: "/pacientes" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: FileText, label: "Prontuários", path: "/prontuarios" },
  { icon: ClipboardList, label: "Escalas Psicológicas", path: "/escalas", badge: "Novo" },
  { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
  { icon: Receipt, label: "Documentos", path: "/documentos" },
];

const secondaryNavItems = [
  { icon: Heart, label: "Portal do Paciente", path: "/portal-paciente" },
  { icon: Video, label: "Teleatendimento", path: "/teleatendimento" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
  { icon: MessageSquare, label: "Assistente IA", path: "/assistente-ia", badge: "IA" },
  { icon: Shield, label: "Usuários", path: "/admin/usuarios", adminOnly: true },
  { icon: Shield, label: "Super Admin", path: "/super-admin", superAdminOnly: true },
];

export function MobileHeader({ isAdmin, isSuperAdmin, onOpenSearch, notifications = 0 }: MobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Pre-load logo to avoid flickering
  useEffect(() => {
    setLogoLoaded(true);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/");
    setOpen(false);
  };

  const NavItem = ({ item }: { item: typeof mainNavItems[0] & { adminOnly?: boolean; superAdminOnly?: boolean } }) => {
    if (item.adminOnly && !isAdmin) return null;
    if (item.superAdminOnly && !isSuperAdmin) return null;
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => handleNavigate(item.path)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
          isActive
            ? "bg-primary/10 text-primary border-l-2 border-primary"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
        <span className="font-medium text-sm flex-1">{item.label}</span>
        {item.badge && (
          <Badge
            variant={item.badge === "IA" ? "default" : "secondary"}
            className={cn(
              "text-xs py-0 px-1.5",
              item.badge === "IA" && "bg-gradient-primary"
            )}
          >
            {item.badge}
          </Badge>
        )}
      </motion.button>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-md border-b border-border lg:hidden">
      <div className="flex items-center justify-between h-full px-4">
        {/* Menu button on the left */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0">
            <div className="flex flex-col h-full">
              {/* Sheet Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-md">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-lg text-gradient-primary">
                    PsicoOne
                  </span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto py-4 px-2">
                <div className="space-y-1">
                  {mainNavItems.map((item) => (
                    <NavItem key={item.path} item={item} />
                  ))}
                </div>

                <div className="my-4 mx-4 border-t border-border" />

                <div className="space-y-1">
                  {secondaryNavItems.map((item) => (
                    <NavItem key={item.path} item={item} />
                  ))}
                </div>
              </nav>

              {/* Footer */}
              <div className="border-t border-border p-2 space-y-1">
                <button
                  onClick={() => handleNavigate("/configuracoes")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium text-sm">Configurações</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium text-sm">Sair</span>
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Centered Logo */}
        <div 
          className={cn(
            "absolute left-1/2 -translate-x-1/2 flex items-center gap-2 transition-opacity duration-200",
            logoLoaded ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-md">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base text-gradient-primary">
            PsicoOne
          </span>
        </div>

        {/* Right Actions: Search, Notifications, Theme Toggle */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={onOpenSearch} className="h-9 w-9">
            <Search className="h-4 w-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-9 w-9" 
            onClick={() => handleNavigate("/notificacoes")}
          >
            <Bell className="h-4 w-4" />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-white flex items-center justify-center">
                {notifications > 9 ? "9+" : notifications}
              </span>
            )}
          </Button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}