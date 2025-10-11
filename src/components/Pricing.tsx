import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Pricing = () => {
  const plans = [
    {
      name: "Estudante",
      price: "Gratuito",
      period: "sempre",
      description: "Para estudantes de psicologia",
      features: [
        "Agenda básica",
        "Até 10 pacientes",
        "Prontuário simples",
        "Acesso mobile",
      ],
      cta: "Começar Grátis",
      variant: "outline" as const,
      popular: false
    },
    {
      name: "Profissional",
      price: "R$ 97",
      period: "/mês",
      description: "Para psicólogos autônomos",
      features: [
        "Pacientes ilimitados",
        "Agenda inteligente + WhatsApp",
        "Prontuário com IA",
        "Gestão financeira completa",
        "Teleatendimento",
        "Portal do paciente",
        "Recursos terapêuticos",
        "Documentos e assinaturas digitais"
      ],
      cta: "Teste 15 Dias Grátis",
      variant: "hero" as const,
      popular: true
    },
    {
      name: "Clínica",
      price: "R$ 297",
      period: "/mês",
      description: "Para clínicas com equipes",
      features: [
        "Tudo do Profissional",
        "Múltiplos psicólogos",
        "Gestão de equipes",
        "Relatórios por profissional",
        "Acesso para secretárias",
        "Controle de repasses",
        "Suporte prioritário",
        "Onboarding personalizado"
      ],
      cta: "Falar com Vendas",
      variant: "outline" as const,
      popular: false
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-background" id="pricing">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-foreground">Planos para </span>
            <span className="bg-gradient-primary bg-clip-text text-transparent">cada momento</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Escolha o plano ideal para sua prática profissional
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <PlanCard key={index} {...plan} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Todos os planos incluem suporte técnico via WhatsApp • Sem taxa de adesão • Cancele quando quiser
          </p>
        </div>
      </div>
    </section>
  );
};

interface PlanCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  variant: "outline" | "hero";
  popular: boolean;
}

const PlanCard = ({ name, price, period, description, features, cta, variant, popular }: PlanCardProps) => {
  return (
    <div className={`relative p-8 rounded-2xl border transition-all duration-300 hover:shadow-xl ${
      popular 
        ? 'border-primary bg-gradient-card shadow-lg scale-105' 
        : 'border-border bg-card hover:border-primary/50'
    }`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground shadow-md">
            MAIS POPULAR
          </span>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-card-foreground mb-2">{name}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-foreground">{price}</span>
          <span className="text-muted-foreground">{period}</span>
        </div>

        <Button variant={variant} size="lg" className="w-full">
          {cta}
        </Button>

        <div className="space-y-3 pt-4 border-t border-border">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-primary" />
              </div>
              <span className="text-sm text-card-foreground">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
