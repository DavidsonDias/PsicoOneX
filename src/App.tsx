import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ThemeProvider } from "@/components/theme-provider";
import { HelmetProvider } from "react-helmet-async";
import { useAuthRedirect } from "./hooks/useAuthRedirect";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Agenda from "./pages/Agenda";
import MedicalRecords from "./pages/MedicalRecords";
import Financeiro from "./pages/Financeiro";
import Configuracoes from "./pages/Configuracoes";
import PortalPaciente from "./pages/PortalPaciente";
import Relatorios from "./pages/Relatorios";
import Teleatendimento from "./pages/Teleatendimento";
import AdminUsers from "./pages/AdminUsers";
import Documentos from "./pages/Documentos";
import EscalasPsicologicas from "./pages/EscalasPsicologicas";
import AssistenteIA from "./pages/AssistenteIA";
import Notificacoes from "./pages/Notificacoes";
import SuperAdmin from "./pages/SuperAdmin";
import Lixeira from "./pages/Lixeira";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthRedirectHandler() {
  useAuthRedirect();
  return null;
}

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthRedirectHandler />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pacientes" element={<Patients />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/prontuarios" element={<MedicalRecords />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/portal-paciente" element={<PortalPaciente />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/teleatendimento" element={<Teleatendimento />} />
                <Route path="/admin/usuarios" element={<AdminUsers />} />
                <Route path="/documentos" element={<Documentos />} />
                <Route path="/escalas" element={<EscalasPsicologicas />} />
                <Route path="/assistente-ia" element={<AssistenteIA />} />
                <Route path="/notificacoes" element={<Notificacoes />} />
                <Route path="/super-admin" element={<SuperAdmin />} />
                <Route path="/lixeira" element={<Lixeira />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
