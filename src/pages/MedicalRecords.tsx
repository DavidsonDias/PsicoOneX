import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, FileText, Calendar, User, Search, Sparkles, Paperclip, Download, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ActionMenu } from "@/components/ui/action-menu";
import { AppLayout } from "@/components/layout/AppLayout";

interface MedicalRecord {
  id: string;
  patient_id: string;
  session_date: string;
  session_number: number | null;
  complaints: string | null;
  observations: string | null;
  techniques_used: string | null;
  evolution: string | null;
  next_steps: string | null;
  patients: {
    full_name: string;
  };
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface Patient {
  id: string;
  full_name: string;
}

const MedicalRecords = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    session_date: format(new Date(), "yyyy-MM-dd"),
    session_number: 1,
    complaints: "",
    observations: "",
    techniques_used: "",
    evolution: "",
    next_steps: ""
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return;
    }
    setUserId(session.user.id);
    await Promise.all([loadRecords(session.user.id), loadPatients()]);
    setLoading(false);
  };

  const loadRecords = async (psychologistId: string) => {
    const { data, error } = await supabase
      .from("medical_records")
      .select(`
        *,
        patients (
          full_name
        )
      `)
      .eq("psychologist_id", psychologistId)
      .order("session_date", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar prontuários");
      return;
    }
    setRecords(data || []);
  };

  const loadPatients = async () => {
    const { data, error } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");

    if (error) {
      toast.error("Erro ao carregar pacientes");
      return;
    }
    setPatients(data || []);
  };

  const loadAttachments = async (recordId: string) => {
    const { data, error } = await supabase
      .from("medical_record_attachments")
      .select("*")
      .eq("medical_record_id", recordId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading attachments:", error);
      return;
    }
    setAttachments(data || []);
  };

  const generateWithAI = async () => {
    if (!formData.patient_id) {
      toast.error("Selecione um paciente primeiro");
      return;
    }

    const patient = patients.find(p => p.id === formData.patient_id);
    if (!patient) return;

    setGeneratingAI(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-medical-record', {
        body: {
          complaints: formData.complaints,
          observations: formData.observations,
          techniques_used: formData.techniques_used,
          evolution: formData.evolution,
          patient_name: patient.full_name
        }
      });

      if (error) throw error;

      setFormData({
        ...formData,
        complaints: data.complaints || formData.complaints,
        observations: data.observations || formData.observations,
        techniques_used: data.techniques_used || formData.techniques_used,
        evolution: data.evolution || formData.evolution,
        next_steps: data.next_steps || formData.next_steps
      });

      toast.success("Prontuário gerado com IA!");
    } catch (error) {
      console.error('Error generating with AI:', error);
      toast.error("Erro ao gerar com IA");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patient_id) {
      toast.error("Selecione um paciente");
      return;
    }

    const { error } = await supabase
      .from("medical_records")
      .insert({
        patient_id: formData.patient_id,
        psychologist_id: userId,
        session_date: formData.session_date,
        session_number: formData.session_number,
        complaints: formData.complaints || null,
        observations: formData.observations || null,
        techniques_used: formData.techniques_used || null,
        evolution: formData.evolution || null,
        next_steps: formData.next_steps || null
      });

    if (error) {
      toast.error("Erro ao criar prontuário");
      return;
    }

    toast.success("Prontuário criado com sucesso!");
    setDialogOpen(false);
    resetForm();
    await loadRecords(userId);
  };

  const handleEditRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const { error } = await supabase
      .from("medical_records")
      .update({
        patient_id: formData.patient_id,
        session_date: formData.session_date,
        session_number: formData.session_number,
        complaints: formData.complaints || null,
        observations: formData.observations || null,
        techniques_used: formData.techniques_used || null,
        evolution: formData.evolution || null,
        next_steps: formData.next_steps || null
      })
      .eq("id", editingRecord.id);

    if (error) {
      toast.error("Erro ao atualizar prontuário");
      return;
    }

    toast.success("Prontuário atualizado com sucesso!");
    setEditingRecord(null);
    resetForm();
    await loadRecords(userId);
  };

  const handleDeleteRecord = async (recordId: string) => {
    const { error } = await supabase
      .from("medical_records")
      .delete()
      .eq("id", recordId);

    if (error) {
      toast.error("Erro ao excluir prontuário");
      return;
    }

    toast.success("Prontuário excluído com sucesso!");
    setViewDialogOpen(false);
    setSelectedRecord(null);
    await loadRecords(userId);
  };

  const openEditDialog = (record: MedicalRecord) => {
    setFormData({
      patient_id: record.patient_id,
      session_date: record.session_date,
      session_number: record.session_number || 1,
      complaints: record.complaints || "",
      observations: record.observations || "",
      techniques_used: record.techniques_used || "",
      evolution: record.evolution || "",
      next_steps: record.next_steps || ""
    });
    setEditingRecord(record);
  };

  const resetForm = () => {
    setFormData({
      patient_id: "",
      session_date: format(new Date(), "yyyy-MM-dd"),
      session_number: 1,
      complaints: "",
      observations: "",
      techniques_used: "",
      evolution: "",
      next_steps: ""
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedRecord || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setUploadingFile(true);

    try {
      const filePath = `${userId}/${selectedRecord.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("medical-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("medical_record_attachments")
        .insert({
          medical_record_id: selectedRecord.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: userId
        });

      if (dbError) throw dbError;

      toast.success("Arquivo anexado com sucesso!");
      await loadAttachments(selectedRecord.id);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao anexar arquivo");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from("medical-attachments")
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Erro ao baixar arquivo");
    }
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    try {
      await supabase.storage
        .from("medical-attachments")
        .remove([attachment.file_path]);

      await supabase
        .from("medical_record_attachments")
        .delete()
        .eq("id", attachment.id);

      toast.success("Arquivo excluído!");
      if (selectedRecord) {
        await loadAttachments(selectedRecord.id);
      }
    } catch (error) {
      toast.error("Erro ao excluir arquivo");
    }
  };

  const openViewDialog = async (record: MedicalRecord) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
    await loadAttachments(record.id);
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.patients.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.complaints?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPatient = selectedPatient === "all" || record.patient_id === selectedPatient;
    return matchesSearch && matchesPatient;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  return (
    <AppLayout title="Prontuários" description="Registros clínicos das sessões">
      <div className="flex justify-end mb-6">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Prontuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Novo Registro de Sessão</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateWithAI}
                  disabled={generatingAI || !formData.patient_id}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {generatingAI ? "Gerando..." : "Gerar com IA"}
                </Button>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient">Paciente *</Label>
                  <Select value={formData.patient_id} onValueChange={(value) => setFormData({...formData, patient_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(patient => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session_date">Data da Sessão *</Label>
                  <Input
                    id="session_date"
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData({...formData, session_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session_number">Número da Sessão</Label>
                <Input
                  id="session_number"
                  type="number"
                  min="1"
                  value={formData.session_number}
                  onChange={(e) => setFormData({...formData, session_number: parseInt(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complaints">Queixas Apresentadas</Label>
                <Textarea
                  id="complaints"
                  value={formData.complaints}
                  onChange={(e) => setFormData({...formData, complaints: e.target.value})}
                  placeholder="Motivo da consulta e queixas do paciente"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações Clínicas</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({...formData, observations: e.target.value})}
                  placeholder="Estado emocional, comportamento, relatos relevantes"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="techniques_used">Técnicas Utilizadas</Label>
                <Textarea
                  id="techniques_used"
                  value={formData.techniques_used}
                  onChange={(e) => setFormData({...formData, techniques_used: e.target.value})}
                  placeholder="Técnicas aplicadas, exercícios propostos, discussões"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="evolution">Evolução do Tratamento</Label>
                <Textarea
                  id="evolution"
                  value={formData.evolution}
                  onChange={(e) => setFormData({...formData, evolution: e.target.value})}
                  placeholder="Progressos observados e mudanças no quadro clínico"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="next_steps">Próximos Passos</Label>
                <Textarea
                  id="next_steps"
                  value={formData.next_steps}
                  onChange={(e) => setFormData({...formData, next_steps: e.target.value})}
                  placeholder="Plano para as próximas sessões e orientações"
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full">
                Salvar Prontuário
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por paciente ou queixas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Filtrar por paciente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pacientes</SelectItem>
              {patients.map(patient => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Nenhum prontuário encontrado</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRecords.map(record => (
              <div key={record.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1 cursor-pointer flex-1" onClick={() => openViewDialog(record)}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-lg text-foreground">{record.patients.full_name}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(record.session_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                      <span>Sessão #{record.session_number || 1}</span>
                    </div>
                  </div>
                  <ActionMenu
                    onEdit={() => openEditDialog(record)}
                    onDelete={() => handleDeleteRecord(record.id)}
                    deleteTitle="Excluir Prontuário"
                    deleteDescription="Tem certeza que deseja excluir este prontuário? Todos os anexos também serão removidos."
                  />
                </div>

                <div className="cursor-pointer" onClick={() => openViewDialog(record)}>
                  {record.complaints && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-foreground mb-1">Queixas:</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{record.complaints}</p>
                    </div>
                  )}

                  {record.observations && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Observações:</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{record.observations}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Dialog with Attachments */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Prontuário</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Paciente</p>
                  <p className="font-semibold">{selectedRecord.patients.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data da Sessão</p>
                  <p className="font-semibold">{format(new Date(selectedRecord.session_date), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Número da Sessão</p>
                  <p className="font-semibold">#{selectedRecord.session_number || 1}</p>
                </div>
              </div>

              {selectedRecord.complaints && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Queixas Apresentadas</h4>
                  <p className="text-muted-foreground">{selectedRecord.complaints}</p>
                </div>
              )}

              {selectedRecord.observations && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Observações Clínicas</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedRecord.observations}</p>
                </div>
              )}

              {selectedRecord.techniques_used && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Técnicas Utilizadas</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedRecord.techniques_used}</p>
                </div>
              )}

              {selectedRecord.evolution && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Evolução do Tratamento</h4>
                  <p className="text-muted-foreground">{selectedRecord.evolution}</p>
                </div>
              )}

              {selectedRecord.next_steps && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Próximos Passos</h4>
                  <p className="text-muted-foreground">{selectedRecord.next_steps}</p>
                </div>
              )}

              {/* Attachments Section */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Anexos ({attachments.length})
                  </h4>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                    <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                      <span>
                        <Upload className="h-4 w-4" />
                        {uploadingFile ? "Enviando..." : "Anexar Arquivo"}
                      </span>
                    </Button>
                  </label>
                </div>

                {attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum anexo neste prontuário
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{attachment.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.file_size)} • {format(new Date(attachment.created_at), "dd/MM/yyyy HH:mm")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadAttachment(attachment)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteAttachment(attachment)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => { if (!open) { setEditingRecord(null); resetForm(); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Editar Prontuário</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateWithAI}
                disabled={generatingAI || !formData.patient_id}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {generatingAI ? "Gerando..." : "Gerar com IA"}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditRecord} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Paciente *</Label>
                <Select value={formData.patient_id} onValueChange={(value) => setFormData({...formData, patient_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data da Sessão *</Label>
                <Input
                  type="date"
                  value={formData.session_date}
                  onChange={(e) => setFormData({...formData, session_date: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Número da Sessão</Label>
              <Input
                type="number"
                min="1"
                value={formData.session_number}
                onChange={(e) => setFormData({...formData, session_number: parseInt(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label>Queixas Apresentadas</Label>
              <Textarea
                value={formData.complaints}
                onChange={(e) => setFormData({...formData, complaints: e.target.value})}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações Clínicas</Label>
              <Textarea
                value={formData.observations}
                onChange={(e) => setFormData({...formData, observations: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Técnicas Utilizadas</Label>
              <Textarea
                value={formData.techniques_used}
                onChange={(e) => setFormData({...formData, techniques_used: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Evolução do Tratamento</Label>
              <Textarea
                value={formData.evolution}
                onChange={(e) => setFormData({...formData, evolution: e.target.value})}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Próximos Passos</Label>
              <Textarea
                value={formData.next_steps}
                onChange={(e) => setFormData({...formData, next_steps: e.target.value})}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditingRecord(null); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MedicalRecords;
