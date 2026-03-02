import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus, Download, Receipt, FileCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  patientId: string;
  patientName: string;
}

export function PatientDocumentsTab({ patientId, patientName }: Props) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Documentos vinculados a {patientName}</p>
        <Button className="gap-2" onClick={() => navigate("/documentos")}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Emitir Documento</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate("/documentos")}
        >
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Recibo</p>
              <p className="text-sm text-muted-foreground">Emitir recibo de pagamento</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate("/documentos")}
        >
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
              <FileCheck className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="font-medium">Declaração</p>
              <p className="text-sm text-muted-foreground">Emitir declaração de acompanhamento</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate("/documentos")}
        >
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="font-medium">Atestado</p>
              <p className="text-sm text-muted-foreground">Emitir atestado psicológico</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate("/documentos")}
        >
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Download className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Relatório</p>
              <p className="text-sm text-muted-foreground">Gerar relatório clínico</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6">
        Para emitir documentos, você será direcionado à Central de Documentos com o paciente pré-selecionado.
      </p>
    </div>
  );
}
