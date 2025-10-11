import { TrendingUp } from "lucide-react";

export const Stats = () => {
  const stats = [
    {
      value: "20min",
      label: "Economizados por sessão",
      description: "com IA gerando prontuários"
    },
    {
      value: "40%",
      label: "Redução de faltas",
      description: "com lembretes automáticos"
    },
    {
      value: "15 dias",
      label: "Teste Gratuito",
      description: "sem exigir cartão"
    },
    {
      value: "24/7",
      label: "Suporte Técnico",
      description: "via WhatsApp dedicado"
    }
  ];

  return (
    <section className="py-16 bg-gradient-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {stat.value}
                </span>
                {index === 1 && <TrendingUp className="w-8 h-8 text-primary" />}
              </div>
              <p className="text-lg font-semibold text-foreground">{stat.label}</p>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
