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
  const modules = [
    {
      icon: Users,
      title: "Gestão de Pacientes",
      description: "Cadastro completo com histórico clínico, anexos e portal exclusivo para pacientes",
      color: "bg-blue-500/10 text-blue-500"
    },
    {
      icon: Calendar,
      title: "Agenda Online",
      description: "Agendamento automático, lembretes por WhatsApp, SMS e sincronização com Google Calendar",
      color: "bg-purple-500/10 text-purple-500"
    },
    {
      icon: FileText,
      title: "Prontuário Eletrônico",
      description: "PEP completo com IA para geração automática e campos personalizáveis por abordagem",
      color: "bg-indigo-500/10 text-indigo-500"
    },
    {
      icon: Brain,
      title: "Ferramentas Clínicas",
      description: "Escalas, testes psicológicos, RPD, conceituação cognitiva e recursos terapêuticos",
      color: "bg-pink-500/10 text-pink-500"
    },
    {
      icon: DollarSign,
      title: "PsicoBank",
      description: "Gestão financeira completa com emissão de notas fiscais e pagamentos integrados",
      color: "bg-green-500/10 text-green-500"
    },
    {
      icon: Video,
      title: "Teleatendimento",
      description: "Sala virtual integrada com recursos terapêuticos em tempo real e transcrição automática",
      color: "bg-red-500/10 text-red-500"
    },
    {
      icon: FileCheck,
      title: "Documentos Digitais",
      description: "Recibos, atestados, laudos com assinatura digital e validade jurídica",
      color: "bg-yellow-500/10 text-yellow-500"
    },
    {
      icon: Smartphone,
      title: "App Mobile",
      description: "Portal do paciente com agendamento, diário de emoções e acesso aos documentos",
      color: "bg-cyan-500/10 text-cyan-500"
    },
    {
      icon: BarChart3,
      title: "Dashboards",
      description: "KPIs em tempo real, relatórios inteligentes e análise de desempenho",
      color: "bg-orange-500/10 text-orange-500"
    },
    {
      icon: HeartPulse,
      title: "Recursos Terapêuticos",
      description: "Jogos e atividades lúdicas para ansiedade, memória e déficit de atenção",
      color: "bg-rose-500/10 text-rose-500"
    },
    {
      icon: MessageSquare,
      title: "Comunicação",
      description: "Notificações automáticas, confirmações de sessão e canal seguro com pacientes",
      color: "bg-teal-500/10 text-teal-500"
    },
    {
      icon: Lock,
      title: "Segurança LGPD",
      description: "Criptografia de ponta a ponta, backups automáticos e conformidade total",
      color: "bg-slate-500/10 text-slate-500"
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-foreground">Tudo que você precisa em </span>
            <span className="text-gradient-primary">uma plataforma</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            12 módulos completos que automatizam sua prática clínica e administrativa
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {modules.map((module, index) => (
            <ModuleCard key={index} {...module} />
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
  color: string;
}

const ModuleCard = ({ icon: Icon, title, description, color }: ModuleCardProps) => {
  return (
    <div className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="space-y-4">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
};
