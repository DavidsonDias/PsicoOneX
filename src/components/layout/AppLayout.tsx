import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { AppSidebar } from "./AppSidebar";
import { MobileHeader } from "./MobileHeader";
import { CommandPalette } from "./CommandPalette";
import { Brain } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AppLayout({ children, title, description }: AppLayoutProps) {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const { collapsed } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto shadow-lg"
          >
            <Brain className="w-8 h-8 text-white" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground"
          >
            Carregando PsicoOne...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <AppSidebar 
        isAdmin={isAdmin} 
        isSuperAdmin={isSuperAdmin}
        onOpenCommandPalette={() => setCommandOpen(true)}
      />

      {/* Mobile Header */}
      <MobileHeader 
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        onOpenSearch={() => setCommandOpen(true)}
      />
      
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Main Content - Responsive padding */}
      <main 
        className={cn(
          "min-h-screen transition-all duration-200",
          // Desktop: left padding for sidebar
          "lg:pl-[280px]",
          collapsed && "lg:pl-[72px]",
          // Mobile: top padding for header
          "pt-16 lg:pt-0"
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 py-6 lg:py-8 max-w-7xl">
          {/* Page Header */}
          {(title || description) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 lg:mb-8"
            >
              {title && (
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
              )}
              {description && (
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">{description}</p>
              )}
            </motion.div>
          )}

          {/* Page Content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
