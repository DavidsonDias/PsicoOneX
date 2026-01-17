import { Check, Sparkles, Clock, TrendingUp, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Benefits = () => {
  const benefits = [
    {
      icon: Clock,
      title: "Economize até 20 minutos por sessão",
      description: "IA generativa cria prontuários automaticamente enquanto você se concentra no paciente"
    },
    {
      icon: TrendingUp,
      title: "Reduza faltas em até 40%",
      description: "Lembretes automáticos por WhatsApp, SMS e confirmações inteligentes"
    },
    {
      icon: Shield,
      title: "100% conforme LGPD e CFP",
      description: "Criptografia de ponta a ponta e conformidade com todas as normas éticas"
    },
    {
      icon: Zap,
      title: "Automatize tarefas administrativas",
      description: "Foque no atendimento enquanto o sistema cuida da gestão financeira e documentação"
    }
  ];

  const differentials = [
    "IA para prontuários e criação de conteúdo",
    "Recursos terapêuticos gamificados",
    "PsicoBank com transações integradas",
    "Teleatendimento com sala virtual própria",
    "App mobile nativo para pacientes",
    "Emissão automática de notas fiscais",
    "Integração com planos de saúde",
    "Suporte técnico dedicado via WhatsApp"
  ];

  return (
    <section className="py-20 md:py-32 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Benefits Grid */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="text-gradient-primary">Por que </span>
              <span className="text-foreground">escolher o PsicoOne?</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <BenefitCard key={index} {...benefit} />
            ))}
          </div>
        </div>

        {/* Differentials Section */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-card border border-border rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="w-8 h-8 text-primary" />
                <h3 className="text-3xl font-bold text-foreground">Diferenciais Exclusivos</h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {differentials.map((differential, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-foreground">{differential}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button variant="hero" size="lg" onClick={() => window.location.href = '/auth'}>
                  Começar Agora - 15 Dias Grátis
                </Button>
                <Button variant="outline" size="lg">
                  Falar com Especialista
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface BenefitCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const BenefitCard = ({ icon: Icon, title, description }: BenefitCardProps) => {
  return (
    <div className="group bg-card border border-border rounded-xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-card-foreground">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
};
