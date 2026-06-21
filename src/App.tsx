import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { PatientProvider } from "@/contexts/PatientContext";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeApplier } from "@/components/ThemeApplier";

import { HelmetProvider } from "react-helmet-async";
import { useAuthRedirect } from "./hooks/useAuthRedirect";
import { SyncProvider } from "./contexts/SyncContext";
import { Loader2 } from "lucide-react";

// Eagerly load critical routes
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load all other routes
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Patients = lazy(() => import("./pages/Patients"));
const Agenda = lazy(() => import("./pages/Agenda"));
const MedicalRecords = lazy(() => import("./pages/MedicalRecords"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const PushDiagnostics = lazy(() => import("./pages/PushDiagnostics"));
const NotificationDiagnostics = lazy(() => import("./pages/NotificationDiagnostics"));
const PortalPaciente = lazy(() => import("./pages/PortalPaciente"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Teleatendimento = lazy(() => import("./pages/Teleatendimento"));
const SalaTeleatendimento = lazy(() => import("./pages/SalaTeleatendimento"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const Documentos = lazy(() => import("./pages/Documentos"));
const EscalasPsicologicas = lazy(() => import("./pages/EscalasPsicologicas"));
const AssistenteIA = lazy(() => import("./pages/AssistenteIA"));
const Notificacoes = lazy(() => import("./pages/Notificacoes"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const SistemaAuditoria = lazy(() => import("./pages/SistemaAuditoria"));
const Lixeira = lazy(() => import("./pages/Lixeira"));
const PatientProfile = lazy(() => import("./pages/PatientProfile"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PortalPacienteExterno = lazy(() => import("./pages/PortalPacienteExterno"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PatientOnboarding = lazy(() => import("./pages/PatientOnboarding"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const PortalLogin = lazy(() => import("./pages/portal/PortalLogin"));
const PortalAcceptInvite = lazy(() => import("./pages/portal/PortalAcceptInvite"));
const PatientPortalLayout = lazy(() => import("./components/portal/PatientPortalLayout"));
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const PortalAgenda = lazy(() => import("./pages/portal/PortalAgenda"));
const PortalFinanceiro = lazy(() => import("./pages/portal/PortalFinanceiro"));
const PortalMensagens = lazy(() => import("./pages/portal/PortalMensagens"));

const queryClient = new QueryClient();

function AuthRedirectHandler() {
  useAuthRedirect();
  return null;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={["light","dark","system","midnight","arctic","obsidian","emerald","crimson","neopurple"]} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider>
            <SyncProvider>
            <PatientProvider>
            <ThemeApplier />
            <Toaster />
            <Sonner />

            <BrowserRouter>
              <AuthRedirectHandler />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/pacientes" element={<Patients />} />
                  <Route path="/pacientes/:id" element={<PatientProfile />} />
                  <Route path="/agenda" element={<Agenda />} />
                  <Route path="/prontuarios" element={<MedicalRecords />} />
                  <Route path="/financeiro" element={<Financeiro />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                  <Route path="/configuracoes/diagnostico-push" element={<PushDiagnostics />} />
                  <Route path="/configuracoes/diagnostico-notificacoes" element={<NotificationDiagnostics />} />
                  <Route path="/portal-paciente" element={<PortalPaciente />} />
                  <Route path="/relatorios" element={<Relatorios />} />
                  <Route path="/teleatendimento" element={<Teleatendimento />} />
                  <Route path="/sala/:token" element={<SalaTeleatendimento />} />
                  <Route path="/admin/usuarios" element={<AdminUsers />} />
                  <Route path="/documentos" element={<Documentos />} />
                  <Route path="/escalas" element={<EscalasPsicologicas />} />
                  <Route path="/assistente-ia" element={<AssistenteIA />} />
                  <Route path="/notificacoes" element={<Notificacoes />} />
                  <Route path="/super-admin" element={<SuperAdmin />} />
                  <Route path="/sistema/auditoria" element={<SistemaAuditoria />} />
                  <Route path="/lixeira" element={<Lixeira />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/portal/login" element={<PortalLogin />} />
                  <Route path="/portal/aceitar-convite/:token" element={<PortalAcceptInvite />} />
                  <Route path="/portal" element={<PatientPortalLayout />}>
                    <Route path="dashboard" element={<PortalDashboard />} />
                    <Route path="agenda" element={<PortalAgenda />} />
                    <Route path="financeiro" element={<PortalFinanceiro />} />
                    <Route path="mensagens" element={<PortalMensagens />} />
                  </Route>
                  <Route path="/portal/:token" element={<PortalPacienteExterno />} />
                  <Route path="/onboarding/:token" element={<PatientOnboarding />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
            </PatientProvider>
            </SyncProvider>
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
