import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  DollarSign,
  Plus,
  Video,
  BarChart3,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: Users, label: "Pacientes", path: "/pacientes" },
  // center slot for FAB
  { icon: FileText, label: "Prontuários", path: "/prontuarios" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
];

const quickActions = [
  { icon: Calendar, label: "Agenda", path: "/agenda", color: "text-blue-500" },
  { icon: Video, label: "Atendimento", path: "/teleatendimento", color: "text-purple-500" },
  { icon: DollarSign, label: "Financeiro", path: "/financeiro", color: "text-green-500" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", color: "text-orange-500" },
  { icon: Sparkles, label: "Assistente IA", path: "/assistente-ia", color: "text-pink-500" },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Backdrop when expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(false)}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Expanded quick actions sheet */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed bottom-20 left-4 right-4 z-50 bg-card rounded-2xl border border-border shadow-2xl p-4 lg:hidden safe-area-inset-bottom"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Ações rápidas</h3>
              <button
                onClick={() => setExpanded(false)}
                className="h-8 w-8 rounded-full hover:bg-accent flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.path}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => {
                      navigate(action.path);
                      setExpanded(false);
                    }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/40 hover:bg-muted active:scale-95 transition-all"
                  >
                    <span className={cn("h-10 w-10 rounded-full bg-background flex items-center justify-center", action.color)}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-medium text-center leading-tight">{action.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border lg:hidden safe-area-inset-bottom">
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {tabs.slice(0, 2).map((tab) => (
            <NavTab key={tab.path} tab={tab} location={location} navigate={navigate} />
          ))}

          {/* Center FAB inside bottom nav */}
          <div className="flex items-center justify-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setExpanded((e) => !e)}
              aria-label="Ações rápidas"
              className={cn(
                "h-12 w-12 rounded-full shadow-lg flex items-center justify-center text-primary-foreground -mt-6",
                "bg-gradient-to-br from-primary to-primary/80 ring-4 ring-background"
              )}
            >
              <motion.div animate={{ rotate: expanded ? 45 : 0 }} transition={{ type: "spring", stiffness: 320 }}>
                <Plus className="h-6 w-6" />
              </motion.div>
            </motion.button>
          </div>

          {tabs.slice(2).map((tab) => (
            <NavTab key={tab.path} tab={tab} location={location} navigate={navigate} />
          ))}
        </div>
      </nav>
    </>
  );
}

function NavTab({
  tab,
  location,
  navigate,
}: {
  tab: { icon: any; label: string; path: string };
  location: ReturnType<typeof useLocation>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const isActive = location.pathname === tab.path;
  const Icon = tab.icon;
  return (
    <button
      onClick={() => navigate(tab.path)}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 h-full transition-colors",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="bottomNavIndicator"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <motion.div whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 400 }}>
        <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
      </motion.div>
      <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
        {tab.label}
      </span>
    </button>
  );
}
