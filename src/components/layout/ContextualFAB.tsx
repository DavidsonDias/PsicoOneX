import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  CalendarPlus,
  UserPlus,
  Calendar,
  Users,
  FileText,
  DollarSign,
  Video,
  BarChart3,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FabAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "secondary";
}

interface FabConfig {
  primary: FabAction;
  secondary?: FabAction[];
}

export function ContextualFAB() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const config: FabConfig | null = useMemo(() => {
    const path = location.pathname;

    // Hide on full-screen / immersive routes
    if (
      path.startsWith("/sala/") ||
      path.startsWith("/portal/") ||
      path.startsWith("/auth") ||
      path === "/" ||
      path.startsWith("/super-admin") ||
      path.startsWith("/payment-success") ||
      path.startsWith("/reset-password") ||
      path.startsWith("/unsubscribe")
    ) {
      return null;
    }

    if (path.startsWith("/agenda")) {
      return {
        primary: {
          icon: CalendarPlus,
          label: "Nova consulta",
          onClick: () => window.dispatchEvent(new CustomEvent("psicoone:new-appointment")),
        },
        secondary: [
          { icon: Calendar, label: "Ir para hoje", onClick: () => window.dispatchEvent(new CustomEvent("psicoone:agenda-today")) },
          { icon: Video, label: "Teleatendimento", onClick: () => navigate("/teleatendimento") },
        ],
      };
    }

    if (path.startsWith("/pacientes")) {
      return {
        primary: {
          icon: UserPlus,
          label: "Novo paciente",
          onClick: () => window.dispatchEvent(new CustomEvent("psicoone:new-patient")),
        },
        secondary: [
          { icon: Search, label: "Buscar paciente", onClick: () => window.dispatchEvent(new CustomEvent("psicoone:search-patient")) },
          { icon: CalendarPlus, label: "Nova consulta", onClick: () => navigate("/agenda") },
        ],
      };
    }

    if (path.startsWith("/dashboard")) {
      return {
        primary: {
          icon: Plus,
          label: "Ações rápidas",
          onClick: () => setOpen((o) => !o),
        },
        secondary: [
          { icon: CalendarPlus, label: "Nova consulta", onClick: () => navigate("/agenda") },
          { icon: UserPlus, label: "Novo paciente", onClick: () => navigate("/pacientes") },
          { icon: BarChart3, label: "Relatórios", onClick: () => navigate("/relatorios") },
        ],
      };
    }

    if (path.startsWith("/prontuarios")) {
      return {
        primary: {
          icon: FileText,
          label: "Novo prontuário",
          onClick: () => window.dispatchEvent(new CustomEvent("psicoone:new-record")),
        },
        secondary: [
          { icon: Sparkles, label: "Assistente IA", onClick: () => navigate("/assistente-ia") },
        ],
      };
    }

    if (path.startsWith("/financeiro")) {
      return {
        primary: {
          icon: DollarSign,
          label: "Nova transação",
          onClick: () => window.dispatchEvent(new CustomEvent("psicoone:new-transaction")),
        },
        secondary: [
          { icon: BarChart3, label: "Relatórios", onClick: () => navigate("/relatorios") },
        ],
      };
    }

    if (path.startsWith("/teleatendimento")) {
      return {
        primary: {
          icon: Video,
          label: "Nova sessão",
          onClick: () => window.dispatchEvent(new CustomEvent("psicoone:new-session")),
        },
      };
    }

    // Default: quick global actions
    return {
      primary: {
        icon: Plus,
        label: "Ações",
        onClick: () => setOpen((o) => !o),
      },
      secondary: [
        { icon: CalendarPlus, label: "Nova consulta", onClick: () => navigate("/agenda") },
        { icon: UserPlus, label: "Novo paciente", onClick: () => navigate("/pacientes") },
      ],
    };
  }, [location.pathname, navigate]);

  if (!config) return null;

  const hasSecondary = (config.secondary?.length ?? 0) > 0;
  const PrimaryIcon = config.primary.icon;

  const handlePrimaryClick = () => {
    if (hasSecondary) {
      setOpen((o) => !o);
    } else {
      config.primary.onClick();
    }
  };

  return (
    <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {open && hasSecondary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-end gap-2 pointer-events-auto"
          >
            {config.secondary!.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 350, damping: 22 }}
                  onClick={() => {
                    action.onClick();
                    setOpen(false);
                  }}
                  className="group flex items-center gap-2"
                >
                  <span className="px-3 py-1.5 rounded-lg bg-popover border border-border shadow-md text-xs font-medium whitespace-nowrap">
                    {action.label}
                  </span>
                  <span className="h-11 w-11 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground hover:bg-accent transition-colors">
                    <Icon className="h-5 w-5" />
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={handlePrimaryClick}
        aria-label={config.primary.label}
        className={cn(
          "pointer-events-auto h-14 w-14 rounded-full shadow-xl flex items-center justify-center text-primary-foreground",
          "bg-gradient-to-br from-primary to-primary/80",
          "ring-4 ring-primary/10 hover:ring-primary/20 transition-all"
        )}
      >
        <motion.div
          animate={{ rotate: open && hasSecondary ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {open && hasSecondary ? <X className="h-6 w-6" /> : <PrimaryIcon className="h-6 w-6" />}
        </motion.div>
      </motion.button>
    </div>
  );
}
