import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check, Sparkles, Clock, TrendingUp, Shield, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

export const Benefits = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const benefits = [
    {
      icon: Clock,
      title: "Economize até 20 minutos por sessão",
      description: "IA generativa cria prontuários automaticamente enquanto você se concentra no paciente",
      stat: "20min",
    },
    {
      icon: TrendingUp,
      title: "Reduza faltas em até 40%",
      description: "Lembretes automáticos por WhatsApp, SMS e confirmações inteligentes",
      stat: "40%",
    },
    {
      icon: Shield,
      title: "100% conforme LGPD e CFP",
      description: "Criptografia de ponta a ponta e conformidade com todas as normas éticas",
      stat: "100%",
    },
    {
      icon: Zap,
      title: "Automatize tarefas administrativas",
      description: "Foque no atendimento enquanto o sistema cuida da gestão financeira e documentação",
      stat: "2h+",
    },
  ];

  const differentials = [
    "IA para prontuários e criação de conteúdo",
    "Recursos terapêuticos gamificados",
    "PsicoBank com transações integradas",
    "Teleatendimento com sala virtual própria",
    "App mobile nativo para pacientes",
    "Emissão automática de notas fiscais",
    "Integração com planos de saúde",
    "Suporte técnico dedicado via WhatsApp",
  ];

  return (
    <section className="py-24 md:py-32 bg-muted/30 relative overflow-hidden" ref={containerRef}>
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Benefits Grid */}
        <div className="max-w-6xl mx-auto mb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 space-y-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Benefícios Comprovados
            </span>
            <h2 className="text-4xl md:text-6xl font-bold">
              <span className="text-gradient-primary">Por que </span>
              <span className="text-foreground">escolher o PsicoOne?</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <BenefitCard key={index} {...benefit} index={index} isInView={isInView} />
            ))}
          </div>
        </div>

        {/* Differentials Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-5xl mx-auto"
        >
          <GlassCard className="p-10 md:p-14 relative overflow-hidden" glow>
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
            
            <div className="relative">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg">
                  <Sparkles className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-foreground">
                  Diferenciais Exclusivos
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-10">
                {differentials.map((differential, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.5 + index * 0.05 }}
                  >
                    <div className="mt-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground font-medium">{differential}</span>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="group text-lg shadow-xl"
                  onClick={() => window.location.href = '/auth'}
                >
                  Começar Agora - 15 Dias Grátis
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button variant="outline" size="lg" className="text-lg">
                  Falar com Especialista
                </Button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
};

interface BenefitCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  stat: string;
  index: number;
  isInView: boolean;
}

const BenefitCard = ({ icon: Icon, title, description, stat, index, isInView }: BenefitCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5, scale: 1.01 }}
      className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl"
    >
      <div className="flex items-start gap-5">
        <motion.div 
          className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg"
          whileHover={{ rotate: [0, -5, 5, 0] }}
        >
          <Icon className="w-8 h-8 text-primary-foreground" />
        </motion.div>
        <div className="space-y-2 flex-1">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            <span className="text-2xl font-bold text-gradient-primary whitespace-nowrap">
              {stat}
            </span>
          </div>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
};
