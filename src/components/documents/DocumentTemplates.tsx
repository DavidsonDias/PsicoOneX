import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Receipt, 
  FileCheck, 
  FileText, 
  ClipboardList, 
  Briefcase,
  Heart,
  Scale,
  GraduationCap,
  Star,
  Sparkles
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  isPremium?: boolean;
  content?: string;
}

const templates: Template[] = [
  {
    id: "receipt-standard",
    name: "Recibo Padrão",
    description: "Recibo para sessões de psicoterapia",
    icon: Receipt,
    category: "Recibo",
  },
  {
    id: "declaration-attendance",
    name: "Declaração de Comparecimento",
    description: "Confirmação de presença em consulta",
    icon: FileCheck,
    category: "Declaração",
  },
  {
    id: "certificate-medical",
    name: "Atestado Psicológico",
    description: "Documento para afastamento ou acompanhamento",
    icon: FileText,
    category: "Atestado",
  },
  {
    id: "report-clinical",
    name: "Relatório Clínico",
    description: "Relatório detalhado de acompanhamento",
    icon: ClipboardList,
    category: "Relatório",
  },
  {
    id: "report-juridical",
    name: "Laudo Pericial",
    description: "Documento para fins judiciais",
    icon: Scale,
    category: "Relatório",
    isPremium: true,
  },
  {
    id: "certificate-fitness",
    name: "Atestado de Aptidão",
    description: "Aptidão para atividades específicas",
    icon: Heart,
    category: "Atestado",
  },
  {
    id: "report-school",
    name: "Relatório Escolar",
    description: "Acompanhamento para instituições de ensino",
    icon: GraduationCap,
    category: "Relatório",
  },
  {
    id: "report-corporate",
    name: "Relatório Empresarial",
    description: "Para departamentos de RH",
    icon: Briefcase,
    category: "Relatório",
    isPremium: true,
  },
];

interface DocumentTemplatesProps {
  onSelectTemplate: (template: Template) => void;
  selectedId?: string;
}

export function DocumentTemplates({ onSelectTemplate, selectedId }: DocumentTemplatesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Templates Prontos
        </h3>
        <Badge variant="secondary" className="text-xs">
          {templates.length} disponíveis
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {templates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${
                selectedId === template.id ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => onSelectTemplate(template)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedId === template.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  }`}>
                    <template.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{template.name}</p>
                      {template.isPremium && (
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {template.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
