import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check, Star, Sparkles, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export const Pricing = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const plans = [
    {
      name: "Estudante",
      price: "Gratuito",
      period: "sempre",
      description: "Para estudantes de psicologia iniciando sua jornada",
      features: [
        "Agenda básica",
        "Até 10 pacientes",
        "Prontuário simples",
        "Acesso mobile",
        "Suporte por email",
      ],
      cta: "Começar Grátis",
      variant: "outline" as const,
      popular: false,
      gradient: "from-slate-500/10 to-zinc-500/10",
    },
    {
      name: "Profissional",
      price: "R$ 97",
      period: "/mês",
      description: "Para psicólogos autônomos que querem crescer",
      features: [
        "Pacientes ilimitados",
        "Agenda inteligente + WhatsApp",
        "Prontuário com IA",
        "Gestão financeira completa",
        "Teleatendimento HD",
        "Portal do paciente",
        "Recursos terapêuticos",
        "Documentos + assinatura digital",
        "Suporte prioritário",
      ],
      cta: "Teste 15 Dias Grátis",
      variant: "hero" as const,
      popular: true,
      gradient: "from-primary/20 to-secondary/20",
    },
    {
      name: "Clínica",
      price: "R$ 297",
      period: "/mês",
      description: "Para clínicas e equipes multidisciplinares",
      features: [
        "Tudo do Profissional",
        "Múltiplos psicólogos",
        "Gestão de equipes",
        "Relatórios por profissional",
        "Acesso para secretárias",
        "Controle de repasses",
        "API personalizada",
        "Onboarding dedicado",
        "Gerente de sucesso",
      ],
      cta: "Falar com Vendas",
      variant: "outline" as const,
      popular: false,
      gradient: "from-purple-500/10 to-pink-500/10",
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden" id="pricing" ref={containerRef}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center mb-16 space-y-6"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Star className="w-4 h-4 fill-current" />
            Planos Flexíveis
          </span>
          <h2 className="text-4xl md:text-6xl font-bold">
            <span className="text-foreground">Planos para </span>
            <span className="text-gradient-primary">cada momento</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Escolha o plano ideal para sua prática profissional. Sem surpresas, sem taxas ocultas.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-start">
          {plans.map((plan, index) => (
            <PlanCard key={index} {...plan} index={index} isInView={isInView} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center space-y-4"
        >
          <p className="text-muted-foreground">
            Todos os planos incluem suporte técnico • Sem taxa de adesão • Cancele quando quiser
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Check className="w-4 h-4 text-primary" />
              Garantia de 30 dias
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Check className="w-4 h-4 text-primary" />
              Migração gratuita
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Check className="w-4 h-4 text-primary" />
              Atualizações inclusas
            </span>
          </div>
        </motion.div>
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
  gradient: string;
  index: number;
  isInView: boolean;
}

const PlanCard = ({ 
  name, 
  price, 
  period, 
  description, 
  features, 
  cta, 
  variant, 
  popular, 
  gradient,
  index,
  isInView,
}: PlanCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      whileHover={{ y: -10 }}
      className={`relative ${popular ? 'md:-mt-4 md:mb-4' : ''}`}
    >
      {popular && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="absolute -top-5 left-1/2 -translate-x-1/2 z-10"
        >
          <span className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-lg">
            <Sparkles className="w-4 h-4" />
            MAIS POPULAR
          </span>
        </motion.div>
      )}

      <GlassCard 
        className={`p-8 h-full transition-all duration-500 ${
          popular 
            ? 'border-primary shadow-2xl shadow-primary/20' 
            : 'hover:border-primary/50 hover:shadow-xl'
        }`}
        glow={popular}
      >
        {/* Gradient background */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-50`} />
        
        <div className="relative space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-card-foreground mb-2">{name}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-foreground">{price}</span>
            <span className="text-muted-foreground text-lg">{period}</span>
          </div>

          <Button 
            variant={variant} 
            size="lg" 
            className={`w-full group ${popular ? 'shadow-lg' : ''}`}
            onClick={() => window.location.href = '/auth'}
          >
            {cta}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>

          <div className="space-y-3 pt-6 border-t border-border">
            {features.map((feature, i) => (
              <motion.div 
                key={i} 
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm text-card-foreground">{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};
