import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { 
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  Video, 
  Lock, 
  Smartphone,
  Brain,
  HeartPulse,
  BarChart3,
  MessageSquare,
  FileCheck
} from "lucide-react";

export const Features = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const modules = [
    {
      icon: Users,
      title: "Gestão de Pacientes",
      description: "Cadastro completo com histórico clínico, anexos e portal exclusivo",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Calendar,
      title: "Agenda Online",
      description: "Agendamento automático e lembretes por WhatsApp, SMS e email",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: FileText,
      title: "Prontuário com IA",
      description: "PEP completo com geração automática e campos personalizáveis",
      gradient: "from-indigo-500 to-purple-500",
    },
    {
      icon: Brain,
      title: "Ferramentas Clínicas",
      description: "Escalas, testes psicológicos, RPD e conceituação cognitiva",
      gradient: "from-pink-500 to-rose-500",
    },
    {
      icon: DollarSign,
      title: "PsicoBank",
      description: "Gestão financeira completa com NF-e e pagamentos integrados",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: Video,
      title: "Teleatendimento",
      description: "Sala virtual com recursos terapêuticos e transcrição automática",
      gradient: "from-red-500 to-orange-500",
    },
    {
      icon: FileCheck,
      title: "Documentos Digitais",
      description: "Recibos, atestados e laudos com assinatura digital",
      gradient: "from-yellow-500 to-amber-500",
    },
    {
      icon: Smartphone,
      title: "App Mobile",
      description: "Portal do paciente com agendamento e diário de emoções",
      gradient: "from-cyan-500 to-teal-500",
    },
    {
      icon: BarChart3,
      title: "Dashboards",
      description: "KPIs em tempo real e relatórios inteligentes",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: HeartPulse,
      title: "Recursos Terapêuticos",
      description: "Jogos e atividades lúdicas para ansiedade e TDAH",
      gradient: "from-rose-500 to-pink-500",
    },
    {
      icon: MessageSquare,
      title: "Comunicação",
      description: "Notificações automáticas e canal seguro com pacientes",
      gradient: "from-teal-500 to-green-500",
    },
    {
      icon: Lock,
      title: "Segurança LGPD",
      description: "Criptografia de ponta a ponta e backups automáticos",
      gradient: "from-slate-500 to-zinc-500",
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden" id="features">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10" ref={containerRef}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center mb-20 space-y-6"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Brain className="w-4 h-4" />
            12 Módulos Integrados
          </span>
          <h2 className="text-4xl md:text-6xl font-bold">
            <span className="text-foreground">Tudo que você precisa </span>
            <br />
            <span className="text-gradient-primary">em uma plataforma</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Gerencie toda sua prática clínica e administrativa em um só lugar
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-7xl mx-auto">
          {modules.map((module, index) => (
            <ModuleCard 
              key={index} 
              {...module} 
              index={index}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

interface ModuleCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  index: number;
  isInView: boolean;
}

const ModuleCard = ({ icon: Icon, title, description, gradient, index, isInView }: ModuleCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl"
    >
      <div className="space-y-4">
        <motion.div 
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
          whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
          transition={{ duration: 0.3 }}
        >
          <Icon className="w-6 h-6 text-white" />
        </motion.div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-card-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
