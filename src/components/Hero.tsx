import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Calendar, FileText, CreditCard, Video, Shield, Sparkles, Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingElement } from "@/components/ui/floating-element";
import { useState, useEffect } from "react";
import demoVideo from "@/../public/videos/demo-psicoone.mp4.asset.json";

const DEMO_VIDEO_URL = demoVideo.url;

export const Hero = () => {
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    if (!demoOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDemoOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [demoOpen]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
  } as const;

  return (
    <section className="relative bg-gradient-hero overflow-hidden min-h-screen flex items-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <FloatingElement className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" delay={0} duration={4}>
          <div />
        </FloatingElement>
        <FloatingElement className="absolute bottom-1/4 right-1/4 w-[32rem] h-[32rem] bg-secondary/5 rounded-full blur-3xl" delay={2} duration={5}>
          <div />
        </FloatingElement>
        <FloatingElement className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary/3 rounded-full blur-3xl" delay={1} duration={6}>
          <div />
        </FloatingElement>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />

      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto text-center space-y-8"
        >
          {/* Badge */}
          <motion.div variants={itemVariants}>
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-card border border-primary/20 shadow-lg">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Plataforma #1 para Psicólogos no Brasil
              </span>
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1 
            variants={itemVariants}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1]"
          >
            <span className="text-gradient-primary">PsicoOne</span>
            <br />
            <span className="text-foreground">
              O Sistema que
              <br className="hidden md:block" /> 
              <span className="relative inline-block">
                Psicólogos Amam
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-3 bg-primary/20 rounded-full -z-10"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1, duration: 0.6 }}
                />
              </span>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            variants={itemVariants}
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
          >
            Automatize prontuários com IA, reduza faltas em 40% e libere 
            <span className="text-foreground font-medium"> 2 horas por dia </span>
            para focar no que importa: seus pacientes.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          >
            <Button 
              variant="hero" 
              size="lg" 
              className="group text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all" 
              onClick={() => window.location.href = '/auth'}
            >
              <span>Começar Grátis - 15 Dias</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="group text-lg px-8 py-6"
              onClick={() => setDemoOpen(true)}
            >
              <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Ver Demonstração
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-x-8 gap-y-3 pt-8"
          >
            {[
              { icon: Shield, text: "100% LGPD" },
              { icon: Brain, text: "IA Integrada" },
              { icon: Video, text: "Teleatendimento" },
            ].map((item, index) => (
              <motion.div 
                key={index}
                className="flex items-center gap-2 text-sm text-muted-foreground"
                whileHover={{ scale: 1.05, color: "hsl(var(--foreground))" }}
              >
                <item.icon className="w-4 h-4 text-primary" />
                <span>{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="grid md:grid-cols-3 gap-6 mt-24 max-w-5xl mx-auto"
        >
          {[
            {
              icon: Calendar,
              title: "Agenda Inteligente",
              description: "Agendamento online, lembretes por WhatsApp e sincronização com Google Calendar",
              gradient: "from-blue-500/20 to-cyan-500/20",
            },
            {
              icon: FileText,
              title: "Prontuário com IA",
              description: "Geração automática de prontuários economiza até 20 minutos por sessão",
              gradient: "from-purple-500/20 to-pink-500/20",
            },
            {
              icon: CreditCard,
              title: "Gestão Financeira",
              description: "Controle completo de pagamentos, recibos e emissão de notas fiscais",
              gradient: "from-green-500/20 to-emerald-500/20",
            },
          ].map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </motion.div>
      </div>

      {/* Demo Video Modal */}
      <AnimatePresence>
        {demoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDemoOpen(false)}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl aspect-video bg-card rounded-2xl overflow-hidden shadow-2xl border border-border"
            >
              <button
                onClick={() => setDemoOpen(false)}
                aria-label="Fechar"
                className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-md hover:bg-background flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <video
                src={DEMO_VIDEO_URL}
                className="w-full h-full object-cover"
                controls
                autoPlay
                playsInline
              />

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  index: number;
}

const FeatureCard = ({ icon: Icon, title, description, gradient, index }: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 + index * 0.15 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative p-8 rounded-2xl bg-card/80 backdrop-blur-lg border border-border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl"
    >
      {/* Gradient background on hover */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="relative space-y-4">
        <motion.div 
          className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg"
          whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
        >
          <Icon className="w-7 h-7 text-primary-foreground" />
        </motion.div>
        <h3 className="text-xl font-bold text-card-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};
