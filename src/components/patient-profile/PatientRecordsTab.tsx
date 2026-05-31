import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Search, Plus, Calendar, Eye, Hash, Edit2, Trash2, Star } from "lucide-react";
import { SmartSearch } from "@/components/medical-records/SmartSearch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProntuarioEditor, type ProntuarioFormData } from "@/components/medical-records/ProntuarioEditor";
import { ActionMenu } from "@/components/ui/action-menu";
import { PeriodAISummary } from "./PeriodAISummary";

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

interface PendingFile {
  id: string;
  file: File;
  preview?: string;
}

interface Props {
  patientId: string;
  patientName: string;
}

const defaultFormData = (sessionDate: string, sessionNumber: number): ProntuarioFormData => ({
  patient_id: "",
  session_date: sessionDate,
  session_number: sessionNumber,
  complaints: "",
  observations: "",
  techniques_used: "",
  evolution: "",
  next_steps: "",
});

/** Split observations field into structured obs + free-form notes */
function splitObservations(obs: string | null) {
  const content = obs || "";
  const marker = "--- Anotações Livres ---";
  const idx = content.indexOf(marker);
  if (idx !== -1) {
    return {
      observations: content.substring(0, idx).trim(),
      freeFormNotes: content.substring(idx + marker.length).trim(),
    };
  }
  return { observations: "", freeFormNotes: content };
}

export function PatientRecordsTab({ patientId, patientName }: Props) {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

  // View
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create / Edit dialog
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProntuarioFormData>(
    defaultFormData(format(new Date(), "yyyy-MM-dd"), 1)
  );
  const [freeFormNotes, setFreeFormNotes] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);

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

  // ── Open create ──
  const openCreate = useCallback(() => {
    const maxSession = Math.max(0, ...records.map(r => r.session_number || 0));
    setFormData({
      ...defaultFormData(format(new Date(), "yyyy-MM-dd"), maxSession + 1),
      patient_id: patientId,
    });
    setFreeFormNotes("");
    setPendingFiles([]);
    setEditingRecordId(null);
    setDialogMode("create");
  }, [records, patientId]);

  // ── Open edit ──
  const openEdit = useCallback((record: Record) => {
    const { observations, freeFormNotes: notes } = splitObservations(record.observations);
    setFormData({
      patient_id: patientId,
      session_date: record.session_date,
      session_number: record.session_number || 1,
      complaints: record.complaints || "",
      observations,
      techniques_used: record.techniques_used || "",
      evolution: record.evolution || "",
      next_steps: record.next_steps || "",
    });
    setFreeFormNotes(notes);
    setPendingFiles([]);
    setEditingRecordId(record.id);
    setDialogMode("edit");
  }, [patientId]);

  // ── Save (create or edit) ──
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sessão expirada"); setSaving(false); return; }

    const combinedObservations = freeFormNotes
      ? (formData.observations ? `${formData.observations}\n\n--- Anotações Livres ---\n${freeFormNotes}` : freeFormNotes)
      : formData.observations || null;

    const payload = {
      patient_id: patientId,
      psychologist_id: session.user.id,
      session_date: formData.session_date,
      session_number: formData.session_number,
      complaints: formData.complaints || null,
      observations: combinedObservations,
      techniques_used: formData.techniques_used || null,
      evolution: formData.evolution || null,
      next_steps: formData.next_steps || null,
    };

    let error;
    if (dialogMode === "edit" && editingRecordId) {
      ({ error } = await supabase.from("medical_records").update(payload).eq("id", editingRecordId));
    } else {
      ({ error } = await supabase.from("medical_records").insert(payload));
    }

    setSaving(false);
    if (error) { toast.error("Erro ao salvar prontuário"); return; }
    toast.success(dialogMode === "edit" ? "Prontuário atualizado!" : "Prontuário criado!");
    setDialogMode(null);
    loadRecords();
  };

  // ── Delete ──
  const handleDelete = async (recordId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("medical_records")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: session.user.id,
        deleted_reason: "Excluído pelo usuário",
      })
      .eq("id", recordId);

    if (error) { toast.error("Erro ao excluir prontuário"); return; }
    toast.success("Prontuário excluído!");
    if (expandedId === recordId) setExpandedId(null);
    loadRecords();
  };

  // ── AI generate ──
  const handleGenerateAI = useCallback(async () => {
    if (!patientId) return;
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-medical-record", {
        body: {
          complaints: formData.complaints,
          observations: formData.observations,
          techniques_used: formData.techniques_used,
          evolution: formData.evolution,
          patient_name: patientName,
          free_notes: freeFormNotes,
        },
      });
      if (error) throw error;
      setFormData(prev => ({
        ...prev,
        complaints: data.complaints || prev.complaints,
        observations: data.observations || prev.observations,
        techniques_used: data.techniques_used || prev.techniques_used,
        evolution: data.evolution || prev.evolution,
        next_steps: data.next_steps || prev.next_steps,
      }));
      toast.success("Prontuário gerado com IA!");
    } catch {
      toast.error("Erro ao gerar com IA");
    } finally {
      setGeneratingAI(false);
    }
  }, [patientId, patientName, formData, freeFormNotes]);

  const handlePreviewPendingFile = useCallback(() => {}, []);

  // ── Filters ──
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
      {/* Smart Search */}
      <SmartSearch
        patientId={patientId}
        records={records}
        onHighlight={setHighlightedIds}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filtrar por texto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
          {filtered.map((record) => {
            const isHighlighted = highlightedIds.includes(record.id);
            return (
            <Card
              key={record.id}
              className={`hover:border-primary/50 transition-colors ${isHighlighted ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : ''}`}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">Sessão {record.session_number ?? "—"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(record.session_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      {/* Summary preview */}
                      {record.observations && !expandedId && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {record.observations.replace(/--- Anotações Livres ---/g, "").trim()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      onEdit={() => openEdit(record)}
                      onDelete={() => handleDelete(record.id)}
                      deleteTitle="Excluir Prontuário"
                      deleteDescription="Tem certeza que deseja excluir este prontuário?"
                    />
                  </div>
                </div>

                {expandedId === record.id && (
                  <div className="mt-4 pt-4 border-t space-y-3 text-sm">
                    {record.observations && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Anotações</p>
                        <p className="whitespace-pre-wrap">{record.observations}</p>
                      </div>
                    )}
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
          )})}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {filtered.length} prontuário(s) encontrado(s)
      </p>

      {/* Create / Edit Dialog — uses the unified ProntuarioEditor */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) setDialogMode(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? "Editar Prontuário" : "Novo Prontuário"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <ProntuarioEditor
              formData={formData}
              setFormData={setFormData}
              freeFormNotes={freeFormNotes}
              setFreeFormNotes={setFreeFormNotes}
              patients={[]}
              pendingFiles={pendingFiles}
              setPendingFiles={setPendingFiles}
              onPreviewPendingFile={handlePreviewPendingFile}
              generatingAI={generatingAI}
              onGenerateAI={handleGenerateAI}
              isEdit={dialogMode === "edit"}
              lockedPatient={{ id: patientId, name: patientName }}
              
            />
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
