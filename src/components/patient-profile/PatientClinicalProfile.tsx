import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readAiCache, writeAiCache } from "@/lib/ai-cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, RefreshCw, TrendingUp, AlertCircle, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  patientId: string;
  patientName: string;
}

interface ClinicalProfile {
  summary: string;
  patterns: string[];
  evolution: string;
  tags: string[];
  riskLevel: "low" | "medium" | "high";
  recommendations: string[];
}

/** Assinatura dos prontuários: muda só quando há sessão nova/alterada. */
function signatureOf(records: Array<Record<string, any>>) {
  const last = records[records.length - 1];
  return `${records.length}|${last?.session_date ?? ""}|${last?.session_number ?? ""}`;
}

export function PatientClinicalProfile({ patientId, patientName }: Props) {
  const [profile, setProfile] = useState<ClinicalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [outdated, setOutdated] = useState(false);
  const cacheKey = `clinical-profile:${patientId}`;

  // Reaproveita o último perfil gerado; marca como desatualizado se houver
  // sessão nova desde então. Nenhuma chamada de IA acontece aqui.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: records } = await supabase
        .from("medical_records")
        .select("session_date, session_number")
        .eq("patient_id", patientId)
        .is("deleted_at", null)
        .order("session_date", { ascending: true });
      if (!active) return;
      const cached = readAiCache<ClinicalProfile>(cacheKey, signatureOf(records || []), Infinity);
      if (cached) {
        setProfile(cached.value);
        setGenerated(true);
        setOutdated(cached.stale);
      }
    })();
    return () => {
      active = false;
    };
  }, [patientId, cacheKey]);

  const generateProfile = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all records for this patient
      const { data: records } = await supabase
        .from("medical_records")
        .select("session_date, session_number, complaints, observations, evolution, techniques_used, next_steps")
        .eq("patient_id", patientId)
        .is("deleted_at", null)
        .order("session_date", { ascending: true });

      if (!records || records.length === 0) {
        toast.info("Nenhum prontuário encontrado para gerar perfil clínico");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("clinical-ai", {
        body: {
          type: "clinical-profile",
          patientName,
          records: records.map(r => ({
            date: r.session_date,
            session: r.session_number,
            complaints: r.complaints,
            observations: r.observations,
            evolution: r.evolution,
            techniques: r.techniques_used,
            nextSteps: r.next_steps,
          })),
        },
      });

      if (error) throw error;

      setProfile(data);
      setGenerated(true);
      setOutdated(false);
      writeAiCache(cacheKey, signatureOf(records), data);
      toast.success("Perfil clínico gerado com IA!");
    } catch (err: any) {
      console.error("Error generating profile:", err);
      toast.error("Erro ao gerar perfil clínico");
    } finally {
      setLoading(false);
    }
  }, [patientId, patientName, cacheKey]);

  const riskColors = {
    low: "bg-green-500/10 text-green-600 border-green-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    high: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  const riskLabels = { low: "Baixo", medium: "Moderado", high: "Alto" };

  if (!generated) {
    return (
      <Card className="border-dashed border-2 border-primary/20">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Perfil Clínico com IA</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Gere automaticamente um resumo clínico, padrões comportamentais e evolução do paciente
            </p>
          </div>
          <Button onClick={generateProfile} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Gerando..." : "Gerar Perfil Clínico"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Resumo Clínico (IA)
            </CardTitle>
            <div className="flex items-center gap-2">
              {outdated && (
                <Badge variant="outline" className="text-[10px]">
                  Desatualizado
                </Badge>
              )}
              <Badge className={cn("text-xs", riskColors[profile.riskLevel])}>
                Risco: {riskLabels[profile.riskLevel]}
              </Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={generateProfile}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{profile.summary}</p>
        </CardContent>
      </Card>

      {/* Tags */}
      {profile.tags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Tags Clínicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patterns */}
      {profile.patterns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Padrões Identificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {profile.patterns.map((pattern, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  {pattern}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Evolution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução Clínica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{profile.evolution}</p>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {profile.recommendations.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Recomendações da IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {profile.recommendations.map((rec, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary font-bold">→</span>
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        Gerado por IA com base nos prontuários. Revise antes de usar clinicamente.
      </p>
    </div>
  );
}
