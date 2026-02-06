import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  FileText, 
  Download, 
  Eye,
  Clock,
  User
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DocumentRecord {
  id: string;
  type: string;
  patientName: string;
  createdAt: Date;
  status: "completed" | "draft" | "signed";
}

const mockHistory: DocumentRecord[] = [
  {
    id: "1",
    type: "Recibo",
    patientName: "Maria Silva",
    createdAt: new Date(),
    status: "signed",
  },
  {
    id: "2",
    type: "Atestado",
    patientName: "João Santos",
    createdAt: new Date(Date.now() - 86400000),
    status: "completed",
  },
  {
    id: "3",
    type: "Declaração",
    patientName: "Ana Costa",
    createdAt: new Date(Date.now() - 86400000 * 2),
    status: "signed",
  },
  {
    id: "4",
    type: "Relatório",
    patientName: "Pedro Lima",
    createdAt: new Date(Date.now() - 86400000 * 5),
    status: "draft",
  },
];

const statusConfig = {
  completed: { label: "Concluído", variant: "default" as const },
  draft: { label: "Rascunho", variant: "secondary" as const },
  signed: { label: "Assinado", variant: "outline" as const },
};

export function DocumentHistory() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Documentos Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-3">
            {mockHistory.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{doc.type}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{doc.patientName}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{format(doc.createdAt, "dd/MM", { locale: ptBR })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusConfig[doc.status].variant} className="text-xs">
                    {statusConfig[doc.status].label}
                  </Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
