import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Save, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ChatMessage } from "@/hooks/useTelehealthChat";

interface PostSessionSummaryProps {
  sessionId: string;
  patientId: string;
  patientName: string;
  chatMessages: ChatMessage[];
  durationSeconds: number;
  onSavedToRecord: (recordId: string) => void;
  onClose: () => void;
}

export const PostSessionSummary = memo(function PostSessionSummary({
  sessionId, patientId, patientName, chatMessages, durationSeconds,
  onSavedToRecord, onClose,
}: PostSessionSummaryProps) {
  const [summary, setSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const generateSummary = async () => {
    setGenerating(true);
    try {
      const chatContext = chatMessages
        .map((m) => `${m.senderName}: ${m.text}`)
        .join("\n");

      const durationMin = Math.round(durationSeconds / 60);

      const { data, error } = await supabase.functions.invoke("summarize-session", {
        body: {
          patientName,
          duration: durationMin,
          chatMessages: chatContext || "Nenhuma mensagem de chat registrada.",
        },
      });

      if (error) throw error;
      setSummary(data?.summary || "Não foi possível gerar o resumo.");
    } catch (e) {
      console.error("Summary generation error:", e);
      toast.error("Erro ao gerar resumo com IA");
    } finally {
      setGenerating(false);
    }
  };

  const saveToRecord = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      // Count existing records for session number
      const { count } = await supabase
        .from("medical_records")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patientId)
        .eq("psychologist_id", session.user.id)
        .is("deleted_at", null);

      const { data: record, error } = await supabase
        .from("medical_records")
        .insert({
          patient_id: patientId,
          psychologist_id: session.user.id,
          session_date: format(new Date(), "yyyy-MM-dd"),
          session_number: (count || 0) + 1,
          observations: summary,
          evolution: `Sessão de teleatendimento - Duração: ${Math.round(durationSeconds / 60)} minutos`,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Update session with record link
      await supabase
        .from("telehealth_sessions")
        .update({
          ai_summary: summary,
          medical_record_id: record.id,
          chat_messages: chatMessages,
        } as any)
        .eq("id", sessionId);

      toast.success("Prontuário criado com sucesso!");
      onSavedToRecord(record.id);
    } catch (e) {
      console.error("Save to record error:", e);
      toast.error("Erro ao salvar prontuário");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Sessão finalizada</h2>
          <p className="text-sm text-muted-foreground">
            {patientName} · {Math.round(durationSeconds / 60)} min
          </p>
        </div>
        <Badge variant="secondary">
          <FileText className="h-3 w-3 mr-1" />
          Teleatendimento
        </Badge>
      </div>

      {!summary && (
        <Button onClick={generateSummary} disabled={generating} className="w-full gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Gerando resumo com IA..." : "Gerar resumo da sessão com IA"}
        </Button>
      )}

      {summary && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Resumo da sessão</label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">Edite o resumo antes de salvar, se necessário.</p>
          </div>

          <div className="flex gap-3">
            <Button onClick={saveToRecord} disabled={saving} className="flex-1 gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar no prontuário
            </Button>
            <Button variant="outline" onClick={onClose}>
              Fechar sem salvar
            </Button>
          </div>
        </div>
      )}

      {!summary && !generating && (
        <Button variant="outline" onClick={onClose} className="w-full">
          Fechar sem resumo
        </Button>
      )}
    </Card>
  );
});
