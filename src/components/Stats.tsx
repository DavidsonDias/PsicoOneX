import { motion, useInView } from "framer-motion";
import { TrendingUp, Clock, Users, HeartHandshake } from "lucide-react";
import { useRef, useEffect, useState } from "react";

export const Stats = () => {
  const stats = [
    {
      icon: Clock,
      value: 20,
      suffix: "min",
      label: "Economizados por sessão",
      description: "com IA gerando prontuários",
    },
    {
      icon: TrendingUp,
      value: 40,
      suffix: "%",
      label: "Redução de faltas",
      description: "com lembretes automáticos",
    },
    {
      icon: Users,
      value: 2000,
      suffix: "+",
      label: "Profissionais",
      description: "usando o PsicoOne",
    },
    {
      icon: HeartHandshake,
      value: 24,
      suffix: "/7",
      label: "Suporte Técnico",
      description: "via WhatsApp dedicado",
    },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section className="py-20 bg-muted/50 border-y border-border relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
      
      <div className="container mx-auto px-4 relative z-10" ref={containerRef}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center space-y-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : {}}
                transition={{ type: "spring", stiffness: 200, delay: index * 0.1 + 0.2 }}
                className="w-16 h-16 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg"
              >
                <stat.icon className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              
              <div className="flex items-center justify-center gap-1">
                <AnimatedNumber 
                  value={stat.value} 
                  isInView={isInView} 
                  delay={index * 0.1}
                />
                <span className="text-4xl md:text-5xl font-bold text-gradient-primary">
                  {stat.suffix}
                </span>
              </div>
              
              <p className="text-lg font-semibold text-foreground">{stat.label}</p>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

function AnimatedNumber({ value, isInView, delay }: { value: number; isInView: boolean; delay: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(interval);
    }, delay * 1000);

    return () => clearTimeout(timeout);
  }, [isInView, value, delay]);

  return (
    <span className="text-4xl md:text-5xl font-bold text-gradient-primary tabular-nums">
      {displayValue.toLocaleString()}
    </span>
  );
}
