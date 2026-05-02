import { Outlet, NavLink, useNavigate, Navigate } from "react-router-dom";
import { Brain, Calendar, LayoutDashboard, DollarSign, LogOut, Menu, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePatientPortalAuth, PatientPortalAuthProvider } from "@/contexts/PatientPortalAuthContext";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { SevenDevXFooter } from "@/components/layout/SevenDevXFooter";

const NAV_ITEMS = [
  { to: "/portal/dashboard", icon: LayoutDashboard, label: "Início" },
  { to: "/portal/agenda", icon: Calendar, label: "Minhas Sessões" },
  { to: "/portal/financeiro", icon: DollarSign, label: "Financeiro" },
  { to: "/portal/mensagens", icon: MessageSquare, label: "Mensagens" },
];

function PortalShell() {
  const { user, patient, loading, signOut } = usePatientPortalAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/portal/login" replace />;
  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold">Acesso não vinculado</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta de acesso não está vinculada a nenhum paciente. Peça um novo convite ao seu profissional.
          </p>
          <Button onClick={signOut} variant="outline">Sair</Button>
        </div>
      </div>
    );
  }

  const initials = patient.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  const Sidebar = () => (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/70 hover:bg-muted hover:text-foreground"
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Top header */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="container max-w-6xl flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                      <Brain className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold">PsicoOne</span>
                  </div>
                </div>
                <Sidebar />
              </SheetContent>
            </Sheet>
            <button onClick={() => navigate("/portal/dashboard")} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold hidden sm:inline">PsicoOne</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium leading-tight">{patient.full_name}</p>
              {patient.psychologist_name && (
                <p className="text-[10px] text-muted-foreground leading-tight">
                  com {patient.psychologist_name}
                </p>
              )}
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl flex-1 grid md:grid-cols-[220px_1fr] gap-0 px-0 md:px-4">
        <aside className="hidden md:block border-r bg-card/40">
          <Sidebar />
        </aside>
        <main className="p-4 md:p-6 pb-20">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t z-30 safe-area-pb">
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2 text-[10px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <SevenDevXFooter />
    </div>
  );
}

export default function PatientPortalLayout() {
  return (
    <PatientPortalAuthProvider>
      <PortalShell />
    </PatientPortalAuthProvider>
  );
}
