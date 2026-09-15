import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Sparkles, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface SmartSearchProps {
  patientId: string;
  records: Array<{
    id: string;
    session_date: string;
    session_number: number | null;
    complaints: string | null;
    observations: string | null;
    evolution: string | null;
    techniques_used: string | null;
    next_steps: string | null;
  }>;
  onHighlight: (ids: string[]) => void;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function SmartSearch({ patientId, records, onHighlight }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    relatedThemes: string[];
    matchCount: number;
    viaAI: boolean;
  } | null>(null);

  const indexed = useMemo(
    () =>
      records.map((r) => ({
        id: r.id,
        session: r.session_number,
        date: r.session_date,
        content: [r.complaints, r.observations, r.evolution, r.techniques_used, r.next_steps]
          .filter(Boolean)
          .join(" "),
      })),
    [records]
  );

  /** Busca textual determinística — sem consumo de IA. */
  const localSearch = useCallback(
    (raw: string) => {
      const terms = normalize(raw).split(/\s+/).filter((t) => t.length >= 3);
      if (terms.length === 0) return [];
      return indexed
        .filter((r) => {
          const haystack = normalize(r.content);
          return terms.some((t) => haystack.includes(t));
        })
        .map((r) => r.id);
    },
    [indexed]
  );

  const handleSearch = useCallback(() => {
    const raw = query.trim();
    if (!raw || indexed.length === 0) return;
    const ids = localSearch(raw);
    onHighlight(ids);
    setResult({
      summary:
        ids.length > 0
          ? "Resultados por correspondência de texto nos prontuários."
          : "Nenhuma correspondência direta. Use a busca com IA para localizar por tema.",
      relatedThemes: [],
      matchCount: ids.length,
      viaAI: false,
    });
  }, [query, indexed, localSearch, onHighlight]);

  /** Busca semântica — só quando o profissional pedir explicitamente. */
  const handleAiSearch = useCallback(async () => {
    const raw = query.trim();
    if (!raw || indexed.length === 0) return;
    setLoading(true);
    try {
      // Envia apenas o subconjunto relevante (ou os mais recentes), nunca
      // todos os prontuários completos do paciente.
      const localIds = new Set(localSearch(raw));
      const candidates = localIds.size > 0
        ? indexed.filter((r) => localIds.has(r.id))
        : indexed.slice(-30);

      const { data, error } = await supabase.functions.invoke("clinical-ai", {
        body: {
          type: "search-records",
          query: raw,
          records: candidates.map((r) => ({
            ...r,
            content: r.content.slice(0, 1500),
          })),
        },
      });

      if (error) throw error;

      const matchingIds = data.matchingIds || [];
      onHighlight(matchingIds);
      setResult({
        summary: data.summary || "Nenhum resultado relevante encontrado.",
        relatedThemes: data.relatedThemes || [],
        matchCount: matchingIds.length,
        viaAI: true,
      });
    } catch (err: any) {
      console.error("Smart search error:", err);
      toast.error("Erro na busca inteligente");
    } finally {
      setLoading(false);
    }
  }, [query, indexed, localSearch, onHighlight]);

  const clearSearch = () => {
    setQuery("");
    setResult(null);
    onHighlight([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder='Buscar nos prontuários: ex. "ansiedade", "técnicas cognitivas"...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} disabled={!query.trim()} size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          Buscar
        </Button>
        <Button
          onClick={handleAiSearch}
          disabled={loading || !query.trim()}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
          Busca com IA
        </Button>
        {result && (
          <Button variant="ghost" size="icon" onClick={clearSearch} className="h-9 w-9">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {result && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 space-y-2">
            <div className="flex items-center gap-2">
              {result.viaAI ? (
                <Sparkles className="h-4 w-4 text-primary" />
              ) : (
                <Search className="h-4 w-4 text-primary" />
              )}
              <span className="text-sm font-medium">{result.matchCount} sessão(ões) encontrada(s)</span>
            </div>
            <p className="text-sm text-muted-foreground">{result.summary}</p>
            {result.relatedThemes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.relatedThemes.map((theme, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-xs cursor-pointer"
                    onClick={() => {
                      setQuery(theme);
                      onHighlight(localSearch(theme));
                    }}
                  >
                    {theme}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
