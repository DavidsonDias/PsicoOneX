import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  Brain, 
  Heart, 
  Users, 
  Baby,
  Briefcase,
  Moon,
  AlertCircle,
  ChevronRight
} from "lucide-react";

interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  techniques: string[];
  suggestedQuestions: string[];
}

const sessionTemplates: SessionTemplate[] = [
  {
    id: "anxiety",
    name: "Manejo de Ansiedade",
    description: "Sessão focada em técnicas de regulação emocional",
    icon: AlertCircle,
    category: "Transtornos",
    techniques: ["Respiração diafragmática", "Reestruturação cognitiva", "Exposição gradual"],
    suggestedQuestions: [
      "Como você tem se sentido nas últimas semanas?",
      "Houve alguma situação que desencadeou ansiedade?",
      "Você conseguiu praticar as técnicas em casa?",
    ],
  },
  {
    id: "depression",
    name: "Acompanhamento Depressão",
    description: "Sessão de suporte para transtorno depressivo",
    icon: Moon,
    category: "Transtornos",
    techniques: ["Ativação comportamental", "Diário de pensamentos", "Questionamento socrático"],
    suggestedQuestions: [
      "Como está seu sono e apetite?",
      "Conseguiu realizar alguma atividade prazerosa?",
      "Quais pensamentos automáticos identificou?",
    ],
  },
  {
    id: "relationship",
    name: "Terapia de Casal",
    description: "Sessão para questões relacionais",
    icon: Heart,
    category: "Relacionamentos",
    techniques: ["Comunicação não-violenta", "Escuta ativa", "Validação emocional"],
    suggestedQuestions: [
      "Como tem sido a comunicação entre vocês?",
      "Houve algum conflito desde a última sessão?",
      "Conseguiram aplicar as técnicas de diálogo?",
    ],
  },
  {
    id: "child",
    name: "Terapia Infantil",
    description: "Sessão lúdica para crianças",
    icon: Baby,
    category: "Infantil",
    techniques: ["Ludoterapia", "Desenho livre", "Contação de histórias"],
    suggestedQuestions: [
      "O que você fez de legal essa semana?",
      "Como está na escola?",
      "Quer me contar sobre algum sonho?",
    ],
  },
  {
    id: "corporate",
    name: "Coaching Executivo",
    description: "Sessão para desenvolvimento profissional",
    icon: Briefcase,
    category: "Carreira",
    techniques: ["Análise SWOT pessoal", "Definição de metas SMART", "Feedback 360°"],
    suggestedQuestions: [
      "Quais desafios enfrentou no trabalho?",
      "Como está seu equilíbrio vida-trabalho?",
      "Quais são suas metas para o próximo mês?",
    ],
  },
  {
    id: "family",
    name: "Terapia Familiar",
    description: "Sessão com dinâmicas familiares",
    icon: Users,
    category: "Família",
    techniques: ["Genograma", "Escultura familiar", "Comunicação assertiva"],
    suggestedQuestions: [
      "Como está a dinâmica em casa?",
      "Houve mudanças nas relações familiares?",
      "Qual foi o momento mais difícil da semana?",
    ],
  },
];

interface SessionTemplatesProps {
  onApplyTemplate: (template: SessionTemplate) => void;
}

export function SessionTemplates({ onApplyTemplate }: SessionTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = ["all", ...new Set(sessionTemplates.map(t => t.category))];
  
  const filteredTemplates = selectedCategory === "all" 
    ? sessionTemplates 
    : sessionTemplates.filter(t => t.category === selectedCategory);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Templates de Sessão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "all" ? "Todos" : cat}
            </Badge>
          ))}
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {filteredTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
                onClick={() => onApplyTemplate(template)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <template.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.techniques.slice(0, 2).map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-[10px]">
                            {tech}
                          </Badge>
                        ))}
                        {template.techniques.length > 2 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{template.techniques.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
