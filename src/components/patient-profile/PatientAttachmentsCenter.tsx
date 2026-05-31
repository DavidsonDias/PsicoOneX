import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, Download, Eye, FileText, FileImage, FileType, Search, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  patientId: string;
  patientName: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size: number;
  created_at: string;
  medical_record_id: string;
  session_date: string;
  session_number: number | null;
}

type Kind = "all" | "image" | "pdf" | "other";

const kindOf = (type: string): Kind => {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  return "other";
};

const formatSize = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

export function PatientAttachmentsCenter({ patientId, patientName }: Props) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<Kind>("all");

  useEffect(() => {
    load();
  }, [patientId]);

  const load = async () => {
    setLoading(true);
    const { data: records } = await supabase
      .from("medical_records")
      .select("id, session_date, session_number")
      .eq("patient_id", patientId)
      .is("deleted_at", null);

    const ids = (records || []).map((r) => r.id);
    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data: atts, error } = await supabase
      .from("medical_record_attachments")
      .select("id, file_name, file_type, file_path, file_size, created_at, medical_record_id")
      .in("medical_record_id", ids)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar anexos");
      setLoading(false);
      return;
    }

    const recMap = new Map((records || []).map((r) => [r.id, r]));
    const enriched: Attachment[] = (atts || []).map((a) => {
      const rec = recMap.get(a.medical_record_id);
      return {
        ...a,
        session_date: rec?.session_date || "",
        session_number: rec?.session_number ?? null,
      };
    });
    setItems(enriched);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (kind !== "all" && kindOf(a.file_type) !== kind) return false;
      if (search && !a.file_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, search, kind]);

  const handleOpen = async (a: Attachment) => {
    const { data, error } = await supabase.storage
      .from("medical-attachments")
      .createSignedUrl(a.file_path, 300);
    if (error || !data) {
      toast.error("Erro ao abrir anexo");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-primary" />
          Central de Anexos — {patientName}
          <Badge variant="secondary" className="ml-auto">{filtered.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar arquivo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={kind} onValueChange={(v: any) => setKind(v)}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="image">Imagens</SelectItem>
              <SelectItem value="pdf">PDFs</SelectItem>
              <SelectItem value="other">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Paperclip className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum anexo encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((a) => {
              const k = kindOf(a.file_type);
              const Icon = k === "image" ? FileImage : k === "pdf" ? FileType : FileText;
              const color = k === "image" ? "text-purple-500 bg-purple-500/10" : k === "pdf" ? "text-red-500 bg-red-500/10" : "text-muted-foreground bg-muted";
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 transition-colors">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{a.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatSize(a.file_size)}</span>
                      {a.session_number && <span>• Sessão {a.session_number}</span>}
                      {a.session_date && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(a.session_date + "T00:00:00"), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleOpen(a)} title="Abrir">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
