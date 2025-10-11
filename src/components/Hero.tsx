import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Calendar, FileText, CreditCard, Video, Shield } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative bg-gradient-hero overflow-hidden">
      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-card border border-border">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Gestão Inteligente, Cuidado Humano</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-primary bg-clip-text text-transparent">PsicoOne</span>
            <br />
            <span className="text-foreground">Sistema Completo para Psicólogos</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Automatize tarefas administrativas, libere tempo para o atendimento clínico e 
            profissionalize sua gestão com a plataforma mais completa do mercado.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button variant="hero" size="lg" className="group">
              Começar Teste Gratuito
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg">
              Ver Demonstração
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>100% Conforme LGPD</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span>IA Integrada</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              <span>Teleatendimento Incluso</span>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
          <FeatureCard
            icon={Calendar}
            title="Agenda Inteligente"
            description="Agendamento online, lembretes automáticos e sincronização com Google Calendar"
          />
          <FeatureCard
            icon={FileText}
            title="Prontuário com IA"
            description="Geração automática de prontuários economiza até 20 minutos por sessão"
          />
          <FeatureCard
            icon={CreditCard}
            title="Gestão Financeira"
            description="Controle completo de pagamentos, recibos e emissão de notas fiscais"
          />
        </div>
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10" />
    </section>
  );
};

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  return (
    <div className="group relative p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
      <div className="absolute inset-0 bg-gradient-card rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative space-y-3">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
};
