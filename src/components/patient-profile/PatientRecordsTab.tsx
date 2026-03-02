import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { FileText, Search, Plus, Calendar, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Record {
  id: string;
  session_date: string;
  session_number: number | null;
  complaints: string | null;
  observations: string | null;
  evolution: string | null;
  techniques_used: string | null;
  next_steps: string | null;
}

interface Props {
  patientId: string;
  patientName: string;
}

export function PatientRecordsTab({ patientId, patientName }: Props) {
  const navigate = useNavigate();
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, [patientId]);

  const loadRecords = async () => {
    const { data, error } = await supabase
      .from("medical_records")
      .select("id, session_date, session_number, complaints, observations, evolution, techniques_used, next_steps")
      .eq("patient_id", patientId)
      .is("deleted_at", null)
      .order("session_date", { ascending: false });

    if (error) { toast.error("Erro ao carregar prontuários"); return; }
    setRecords(data || []);
    setLoading(false);
  };

  const filtered = records.filter(r => {
    if (search) {
      const term = search.toLowerCase();
      const matchesText = [r.complaints, r.observations, r.evolution, r.techniques_used, r.next_steps]
        .some(f => f?.toLowerCase().includes(term));
      if (!matchesText) return false;
    }
    if (dateFrom && r.session_date < dateFrom) return false;
    if (dateTo && r.session_date > dateTo) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nos prontuários..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" placeholder="De" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" placeholder="Até" />
        <Button className="gap-2" onClick={() => navigate("/prontuarios")}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Prontuário</span>
        </Button>
      </div>

      {/* Records list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum prontuário encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <Card
              key={record.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        Sessão {record.session_number ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(record.session_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>

                {expandedId === record.id && (
                  <div className="mt-4 pt-4 border-t space-y-3 text-sm">
                    {record.complaints && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Queixas</p>
                        <p className="whitespace-pre-wrap">{record.complaints}</p>
                      </div>
                    )}
                    {record.evolution && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Evolução</p>
                        <p className="whitespace-pre-wrap">{record.evolution}</p>
                      </div>
                    )}
                    {record.techniques_used && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Técnicas</p>
                        <p className="whitespace-pre-wrap">{record.techniques_used}</p>
                      </div>
                    )}
                    {record.observations && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                        <p className="whitespace-pre-wrap">{record.observations}</p>
                      </div>
                    )}
                    {record.next_steps && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Próximos Passos</p>
                        <p className="whitespace-pre-wrap">{record.next_steps}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {filtered.length} prontuário(s) encontrado(s)
      </p>
    </div>
  );
}
