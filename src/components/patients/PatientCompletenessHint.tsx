import { useMemo } from "react";
import { Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  patient: Record<string, any>;
  onRequestUpdate?: () => void;
}

/**
 * Heuristic completeness hint — flags strategic clinical fields that are empty.
 * No AI call needed; purely deterministic so it always renders fast.
 */
export function PatientCompletenessHint({ patient, onRequestUpdate }: Props) {
  const missing = useMemo(() => {
    const checks: Array<{ key: string; label: string }> = [
      { key: "cpf", label: "CPF" },
      { key: "birth_date", label: "Data de nascimento" },
      { key: "phone", label: "Telefone" },
      { key: "email", label: "E-mail" },
      { key: "emergency_contact", label: "Contato de emergência" },
      { key: "address", label: "Endereço" },
      { key: "initial_demand", label: "Demanda inicial" },
      { key: "education_level", label: "Escolaridade" },
    ];
    return checks.filter((c) => !patient?.[c.key] || String(patient[c.key]).trim() === "");
  }, [patient]);

  if (missing.length === 0) return null;

  return (
    <Alert className="border-amber-500/40 bg-amber-500/5">
      <Sparkles className="h-4 w-4 text-amber-500" />
      <AlertDescription className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm">
          A IA detectou <strong>{missing.length}</strong> campo{missing.length > 1 ? "s" : ""} importante{missing.length > 1 ? "s" : ""} faltando:{" "}
          <span className="text-muted-foreground">{missing.slice(0, 4).map((m) => m.label).join(", ")}{missing.length > 4 ? "…" : ""}</span>
        </span>
        {onRequestUpdate && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onRequestUpdate}>
            <Send className="h-3.5 w-3.5" /> Solicitar atualização
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
