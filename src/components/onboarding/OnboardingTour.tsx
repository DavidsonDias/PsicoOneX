import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, Calendar, Users, FileText, DollarSign, 
  ChevronRight, ChevronLeft, X, CheckCircle2, 
  Sparkles, ArrowRight, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface OnboardingTourProps {
  authProvider: string;
  googleCalendarConnected: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface Step {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  features?: string[];
  variant?: "default" | "google-connected" | "google-prompt" | "welcome" | "finish";
}

export function OnboardingTour({ 
  authProvider, 
  googleCalendarConnected, 
  onComplete, 
  onSkip 
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const googleStep: Step = googleCalendarConnected
    ? {
        id: "google-connected",
        icon: Calendar,
        title: "Google Agenda Conectada ✅",
        description: "Sua agenda já está sincronizada com o Google Calendar automaticamente.",
        features: [
          "Sincronização automática de consultas",
          "Lembretes no Google Agenda",
          "Organização automática de horários",
        ],
        variant: "google-connected",
      }
    : {
        id: "google-prompt",
        icon: Calendar,
        title: "Conecte sua Agenda Google",
        description: "Integre sua agenda do Google para sincronizar automaticamente seus atendimentos com o Google Calendar.",
        features: [
          "Sincronização automática de consultas",
          "Lembretes e alertas no Google Agenda",
          "Organização inteligente de horários",
        ],
        variant: "google-prompt",
      };

  const steps: Step[] = [
    {
      id: "welcome",
      icon: Brain,
      title: "Bem-vindo ao PsicoOne! 🎉",
      description: "Uma plataforma completa para gestão de atendimentos psicológicos.",
      features: [
        "Gerenciar pacientes",
        "Registrar prontuários",
        "Controlar agenda",
        "Acompanhar finanças",
      ],
      variant: "welcome",
    },
    {
      id: "agenda",
      icon: Calendar,
      title: "Agenda Inteligente",
      description: "Agende consultas, organize horários e gerencie seus atendimentos com uma visão clara e integrada.",
      features: [
        "Agendamentos recorrentes",
        "Múltiplas visualizações",
        "Status de atendimento",
        "Integração com Google Calendar",
      ],
    },
    {
      id: "patients",
      icon: Users,
      title: "Gestão de Pacientes",
      description: "Cadastre e organize todos os seus pacientes de forma segura e estruturada.",
      features: [
        "Fichas completas",
        "Histórico de sessões",
        "Dados de contato e emergência",
        "Importação em massa via CSV",
      ],
    },
    {
      id: "records",
      icon: FileText,
      title: "Prontuários Digitais",
      description: "Registre anotações clínicas e evolução das sessões. Todas as informações ficam protegidas e organizadas.",
      features: [
        "Templates personalizados",
        "Gravação por voz",
        "Assistente IA para refinamento",
        "Anexos e documentos",
      ],
    },
    {
      id: "financial",
      icon: DollarSign,
      title: "Gestão Financeira",
      description: "Acompanhe receitas, despesas e o desempenho financeiro do seu consultório.",
      features: [
        "Controle de recebimentos",
        "Relatórios financeiros",
        "Notas e recibos",
        "Projeções e análises",
      ],
    },
    googleStep,
    {
      id: "finish",
      icon: Sparkles,
      title: "Tudo pronto! 🚀",
      description: "Seu PsicoOne está configurado e pronto para uso. Comece agora!",
      variant: "finish",
    },
  ];

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep((s) => s - 1);
  };

  const iconColors: Record<string, string> = {
    welcome: "from-primary to-primary/70",
    agenda: "from-blue-500 to-blue-600",
    patients: "from-emerald-500 to-emerald-600",
    records: "from-amber-500 to-amber-600",
    financial: "from-violet-500 to-violet-600",
    "google-connected": "from-green-500 to-green-600",
    "google-prompt": "from-red-500 to-orange-500",
    finish: "from-primary to-primary/70",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onSkip}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Close/Skip */}
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Icon */}
                <div className="flex justify-center">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                    iconColors[step.id] || iconColors.welcome
                  )}>
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                </div>

                {/* Text */}
                <div className="text-center space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{step.title}</h2>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Features */}
                {step.features && (
                  <div className="space-y-2.5 pt-2">
                    {step.features.map((feature, i) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-3 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Google Calendar connect button */}
                {step.variant === "google-prompt" && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Para conectar sua conta:</p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        <li>Acesse <strong>Configurações</strong></li>
                        <li>Vá até a aba <strong>Integrações</strong></li>
                        <li>Clique em <strong>Conectar Google Agenda</strong></li>
                      </ol>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        onComplete();
                        navigate("/configuracoes?tab=integrations");
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Conectar Google Agenda
                    </Button>
                  </div>
                )}

                {/* Finish actions */}
                {step.variant === "finish" && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        onComplete();
                        navigate("/pacientes");
                      }}
                    >
                      <Users className="h-4 w-4" />
                      Novo Paciente
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={() => {
                        onComplete();
                        navigate("/agenda");
                      }}
                    >
                      <Calendar className="h-4 w-4" />
                      Agendar
                    </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === currentStep
                      ? "w-6 bg-primary"
                      : i < currentStep
                      ? "w-1.5 bg-primary/50"
                      : "w-1.5 bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button variant="ghost" size="sm" onClick={handlePrev} className="gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </Button>
              )}
              {isFirst && (
                <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
                  Pular
                </Button>
              )}
              <Button size="sm" onClick={handleNext} className="gap-1">
                {isLast ? "Começar" : "Próximo"}
                {!isLast && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
