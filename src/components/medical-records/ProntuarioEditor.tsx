import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PatientCombobox } from "@/components/shared/PatientCombobox";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, Sparkles, Paperclip, Info, Hash, UserPlus, Loader2 } from "lucide-react";
import { FreeFormEditor } from "./FreeFormEditor";
import { AttachmentUploader } from "./AttachmentUploader";

interface PendingFile {
  id: string;
  file: File;
  preview?: string;
}

interface Patient {
  id: string;
  full_name: string;
}

export interface ProntuarioFormData {
  patient_id: string;
  session_date: string;
  session_number: number;
  complaints: string;
  observations: string;
  techniques_used: string;
  evolution: string;
  next_steps: string;
}

export interface ProntuarioEditorProps {
  formData: ProntuarioFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProntuarioFormData>>;
  freeFormNotes: string;
  setFreeFormNotes: (v: string) => void;
  patients: Patient[];
  pendingFiles: PendingFile[];
  setPendingFiles: React.Dispatch<React.SetStateAction<PendingFile[]>>;
  onPreviewPendingFile: (pf: PendingFile) => void;
  generatingAI: boolean;
  onGenerateAI: () => void;
  isEdit?: boolean;
  onOpenQuickPatient?: () => void;
  /** When set, the patient selector is locked (used inside patient profile) */
  lockedPatient?: { id: string; name: string } | null;
  /** Custom submit label */
  submitLabel?: string;
  /** Hide attachments section */
  hideAttachments?: boolean;
}

export const ProntuarioEditor = memo(function ProntuarioEditor({
  formData,
  setFormData,
  freeFormNotes,
  setFreeFormNotes,
  patients,
  pendingFiles,
  setPendingFiles,
  onPreviewPendingFile,
  generatingAI,
  onGenerateAI,
  isEdit = false,
  onOpenQuickPatient,
  lockedPatient,
  submitLabel,
  hideAttachments = false,
}: ProntuarioEditorProps) {
  const handleStructuredChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, [setFormData]);

  return (
    <div className="space-y-6">
      {/* Session Info Header */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          Informações da sessão são preenchidas automaticamente
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Patient field */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Paciente *
            </Label>
            {lockedPatient ? (
              <div className="flex items-center gap-3 bg-muted/50 rounded-md px-3 py-2 border border-input">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Paciente</p>
                  <p className="font-medium text-sm truncate">{lockedPatient.name}</p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">Contexto automático</Badge>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={formData.patient_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, patient_id: value }))}
                >
                  <SelectTrigger className="flex-1">
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
                {onOpenQuickPatient && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onOpenQuickPatient}
                    title="Cadastrar paciente novo"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data da Sessão
            </Label>
            <Input
              type="date"
              value={formData.session_date}
              onChange={(e) => setFormData(prev => ({ ...prev, session_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Sessão Nº
              <Badge variant="secondary" className="text-xs">Auto</Badge>
            </Label>
            <Input
              type="number"
              min="1"
              value={formData.session_number}
              onChange={(e) => setFormData(prev => ({ ...prev, session_number: parseInt(e.target.value) }))}
              className="bg-muted/50"
            />
          </div>
        </div>
      </div>

      {/* AI Generation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-medium">Assistente de Escrita</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGenerateAI}
          disabled={generatingAI || !formData.patient_id}
          className="gap-2"
        >
          {generatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generatingAI ? "Gerando..." : "Gerar com IA"}
        </Button>
      </div>

      <Separator />

      {/* Free-Form Editor with Optional Structured Fields */}
      <FreeFormEditor
        value={freeFormNotes}
        onChange={setFreeFormNotes}
        structuredFields={{
          complaints: formData.complaints,
          observations: formData.observations,
          techniques_used: formData.techniques_used,
          evolution: formData.evolution,
          next_steps: formData.next_steps,
        }}
        onStructuredChange={handleStructuredChange}
      />

      {/* Attachments Section */}
      {!hideAttachments && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Anexos
              {pendingFiles.length > 0 && (
                <Badge variant="secondary">{pendingFiles.length}</Badge>
              )}
            </Label>
            <AttachmentUploader
              pendingFiles={pendingFiles}
              onFilesChange={setPendingFiles}
              onPreview={onPreviewPendingFile}
            />
          </div>
        </>
      )}

      <Button type="submit" className="w-full">
        {submitLabel || (isEdit ? "Salvar Alterações" : "Criar Prontuário")}
      </Button>
    </div>
  );
});
