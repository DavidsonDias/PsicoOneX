import { useState, useCallback } from "react";
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

export function SmartSearch({ patientId, records, onHighlight }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    relatedThemes: string[];
    matchCount: number;
  } | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || records.length === 0) return;
    setLoading(true);
    try {
      const recordsPayload = records.map(r => ({
        id: r.id,
        session: r.session_number,
        date: r.session_date,
        content: [r.complaints, r.observations, r.evolution, r.techniques_used, r.next_steps]
          .filter(Boolean).join(' '),
      }));

      const { data, error } = await supabase.functions.invoke("clinical-ai", {
        body: { type: "search-records", query: query.trim(), records: recordsPayload },
      });

      if (error) throw error;

      const matchingIds = data.matchingIds || [];
      onHighlight(matchingIds);
      setResult({
        summary: data.summary || "Nenhum resultado relevante encontrado.",
        relatedThemes: data.relatedThemes || [],
        matchCount: matchingIds.length,
      });
    } catch (err: any) {
      console.error("Smart search error:", err);
      toast.error("Erro na busca inteligente");
    } finally {
      setLoading(false);
    }
  }, [query, records, onHighlight]);

  const clearSearch = () => {
    setQuery("");
    setResult(null);
    onHighlight([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder='Busca inteligente: ex. "ansiedade", "técnicas cognitivas"...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || !query.trim()} className="gap-2" size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Buscar com IA
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
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{result.matchCount} sessão(ões) encontrada(s)</span>
            </div>
            <p className="text-sm text-muted-foreground">{result.summary}</p>
            {result.relatedThemes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.relatedThemes.map((theme, i) => (
                  <Badge key={i} variant="secondary" className="text-xs cursor-pointer" onClick={() => { setQuery(theme); handleSearch(); }}>
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
