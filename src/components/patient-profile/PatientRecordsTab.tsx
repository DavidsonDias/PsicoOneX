import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Search, Plus, Calendar, Eye, Hash, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    session_date: format(new Date(), "yyyy-MM-dd"),
    session_number: 1,
    complaints: "",
    observations: "",
    techniques_used: "",
    evolution: "",
    next_steps: "",
  });

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

  const openCreate = useCallback(() => {
    const maxSession = Math.max(0, ...records.map(r => r.session_number || 0));
    setFormData({
      session_date: format(new Date(), "yyyy-MM-dd"),
      session_number: maxSession + 1,
      complaints: "",
      observations: "",
      techniques_used: "",
      evolution: "",
      next_steps: "",
    });
    setCreateOpen(true);
  }, [records]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sessão expirada"); setSaving(false); return; }

    const { error } = await supabase.from("medical_records").insert({
      patient_id: patientId,
      psychologist_id: session.user.id,
      session_date: formData.session_date,
      session_number: formData.session_number,
      complaints: formData.complaints || null,
      observations: formData.observations || null,
      techniques_used: formData.techniques_used || null,
      evolution: formData.evolution || null,
      next_steps: formData.next_steps || null,
    });

    setSaving(false);
    if (error) { toast.error("Erro ao criar prontuário"); return; }
    toast.success("Prontuário criado!");
    setCreateOpen(false);
    loadRecords();
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
          <Input placeholder="Buscar nos prontuários..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
        <Button className="gap-2" onClick={openCreate}>
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
                      <p className="font-medium text-sm">Sessão {record.session_number ?? "—"}</p>
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
                    {record.complaints && (<div><p className="text-xs font-medium text-muted-foreground mb-1">Queixas</p><p className="whitespace-pre-wrap">{record.complaints}</p></div>)}
                    {record.evolution && (<div><p className="text-xs font-medium text-muted-foreground mb-1">Evolução</p><p className="whitespace-pre-wrap">{record.evolution}</p></div>)}
                    {record.techniques_used && (<div><p className="text-xs font-medium text-muted-foreground mb-1">Técnicas</p><p className="whitespace-pre-wrap">{record.techniques_used}</p></div>)}
                    {record.observations && (<div><p className="text-xs font-medium text-muted-foreground mb-1">Observações</p><p className="whitespace-pre-wrap">{record.observations}</p></div>)}
                    {record.next_steps && (<div><p className="text-xs font-medium text-muted-foreground mb-1">Próximos Passos</p><p className="whitespace-pre-wrap">{record.next_steps}</p></div>)}
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

      {/* Create Record Dialog — patient auto-filled & locked */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Prontuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Patient locked */}
            <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paciente</p>
                <p className="font-medium text-sm">{patientName}</p>
              </div>
              <Badge variant="secondary" className="ml-auto text-xs">Contexto automático</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Sessão</Label>
                <Input type="date" value={formData.session_date} onChange={(e) => setFormData(prev => ({ ...prev, session_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">Sessão Nº <Badge variant="secondary" className="text-xs">Auto</Badge></Label>
                <Input type="number" min="1" value={formData.session_number} onChange={(e) => setFormData(prev => ({ ...prev, session_number: parseInt(e.target.value) }))} />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Queixas</Label>
              <Textarea rows={2} value={formData.complaints} onChange={(e) => setFormData(prev => ({ ...prev, complaints: e.target.value }))} placeholder="Queixas apresentadas pelo paciente..." />
            </div>
            <div className="space-y-2">
              <Label>Evolução</Label>
              <Textarea rows={3} value={formData.evolution} onChange={(e) => setFormData(prev => ({ ...prev, evolution: e.target.value }))} placeholder="Evolução do tratamento..." />
            </div>
            <div className="space-y-2">
              <Label>Técnicas Utilizadas</Label>
              <Textarea rows={2} value={formData.techniques_used} onChange={(e) => setFormData(prev => ({ ...prev, techniques_used: e.target.value }))} placeholder="TCC, EMDR, Psicodinâmica..." />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={formData.observations} onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))} placeholder="Observações gerais..." />
            </div>
            <div className="space-y-2">
              <Label>Próximos Passos</Label>
              <Textarea rows={2} value={formData.next_steps} onChange={(e) => setFormData(prev => ({ ...prev, next_steps: e.target.value }))} placeholder="Plano para as próximas sessões..." />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Salvando..." : "Criar Prontuário"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
