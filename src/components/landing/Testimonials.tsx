import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

const testimonials = [
  {
    name: "Dra. Marina Santos",
    role: "Psicóloga Clínica",
    location: "São Paulo, SP",
    avatar: "MS",
    content:
      "O PsicoOne revolucionou minha prática. Economizo mais de 2 horas por dia com a automação de prontuários. Meus pacientes adoram o portal!",
    rating: 5,
  },
  {
    name: "Dr. Carlos Mendes",
    role: "Psiquiatra",
    location: "Rio de Janeiro, RJ",
    avatar: "CM",
    content:
      "A integração com prontuário eletrônico é impecável. A IA gera resumos precisos e me ajuda a focar 100% no paciente durante as sessões.",
    rating: 5,
  },
  {
    name: "Dra. Ana Luíza Costa",
    role: "Neuropsicóloga",
    location: "Belo Horizonte, MG",
    avatar: "AC",
    content:
      "As escalas psicológicas integradas são incríveis. Consigo aplicar, corrigir e analisar tudo dentro da plataforma. Muito prático!",
    rating: 5,
  },
  {
    name: "Dr. Ricardo Alves",
    role: "Psicólogo TCC",
    location: "Curitiba, PR",
    avatar: "RA",
    content:
      "O teleatendimento é estável e profissional. Os recursos terapêuticos durante as sessões online fazem toda diferença no tratamento.",
    rating: 5,
  },
  {
    name: "Dra. Fernanda Lima",
    role: "Psicóloga Infantil",
    location: "Salvador, BA",
    avatar: "FL",
    content:
      "Os recursos gamificados são perfeitos para atender crianças. Elas adoram e o engajamento no tratamento aumentou muito!",
    rating: 5,
  },
  {
    name: "Dr. Bruno Carvalho",
    role: "Diretor de Clínica",
    location: "Brasília, DF",
    avatar: "BC",
    content:
      "Gerenciar 15 profissionais ficou muito mais fácil. Relatórios, repasses financeiros e agenda - tudo integrado perfeitamente.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-32 bg-background overflow-hidden" id="testimonials">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center mb-16 space-y-4"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Star className="w-4 h-4 fill-current" />
            +2.000 profissionais satisfeitos
          </span>
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-foreground">O que dizem </span>
            <span className="text-gradient-primary">nossos clientes</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Histórias reais de profissionais que transformaram sua prática
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <TestimonialCard {...testimonial} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface TestimonialCardProps {
  name: string;
  role: string;
  location: string;
  avatar: string;
  content: string;
  rating: number;
}

function TestimonialCard({
  name,
  role,
  location,
  avatar,
  content,
  rating,
}: TestimonialCardProps) {
  return (
    <GlassCard className="group p-6 h-full hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative space-y-4">
        {/* Quote icon */}
        <Quote className="absolute -top-2 -left-2 w-8 h-8 text-primary/20" />

        {/* Rating */}
        <div className="flex gap-1">
          {Array.from({ length: rating }).map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-primary text-primary" />
          ))}
        </div>

        {/* Content */}
        <p className="text-muted-foreground leading-relaxed relative z-10">
          "{content}"
        </p>

        {/* Author */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
            {avatar}
          </div>
          <div>
            <p className="font-semibold text-foreground">{name}</p>
            <p className="text-sm text-muted-foreground">
              {role} • {location}
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
