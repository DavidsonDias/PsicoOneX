import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Agenda from "./pages/Agenda";
import MedicalRecords from "./pages/MedicalRecords";
import Financeiro from "./pages/Financeiro";
import Configuracoes from "./pages/Configuracoes";
import PortalPaciente from "./pages/PortalPaciente";
import Relatorios from "./pages/Relatorios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pacientes" element={<Patients />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/prontuarios" element={<MedicalRecords />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/portal-paciente" element={<PortalPaciente />} />
          <Route path="/relatorios" element={<Relatorios />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
