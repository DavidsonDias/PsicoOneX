import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Users,
  Calendar,
  FileText,
  DollarSign,
  LayoutDashboard,
  Heart,
  BarChart3,
  Video,
  Receipt,
  Settings,
  Plus,
  Search,
  ClipboardList,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  type: "patient" | "appointment" | "record";
  title: string;
  subtitle?: string;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Search patients
  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data: patients } = await supabase
        .from("patients")
        .select("id, full_name, email")
        .ilike("full_name", `%${query}%`)
        .limit(5);

      const results: SearchResult[] = (patients || []).map((p) => ({
        id: p.id,
        type: "patient" as const,
        title: p.full_name,
        subtitle: p.email || undefined,
      }));

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery) {
        searchPatients(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, searchPatients]);

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
    setSearchQuery("");
  };

  const navigationItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", keywords: "home inicio painel" },
    { icon: Users, label: "Pacientes", path: "/pacientes", keywords: "clientes pessoas" },
    { icon: Calendar, label: "Agenda", path: "/agenda", keywords: "calendario horarios sessoes" },
    { icon: FileText, label: "Prontuários", path: "/prontuarios", keywords: "registros clinicos notas" },
    { icon: ClipboardList, label: "Escalas Psicológicas", path: "/escalas", keywords: "testes avaliacao phq gad" },
    { icon: DollarSign, label: "Financeiro", path: "/financeiro", keywords: "pagamentos receitas despesas" },
    { icon: Receipt, label: "Documentos", path: "/documentos", keywords: "recibos declaracoes" },
    { icon: Heart, label: "Portal do Paciente", path: "/portal-paciente", keywords: "diario tarefas" },
    { icon: Video, label: "Teleatendimento", path: "/teleatendimento", keywords: "video chamada online" },
    { icon: BarChart3, label: "Relatórios", path: "/relatorios", keywords: "graficos metricas" },
    { icon: MessageSquare, label: "Assistente IA", path: "/assistente-ia", keywords: "chat inteligencia artificial ajuda" },
    { icon: Settings, label: "Configurações", path: "/configuracoes", keywords: "preferencias perfil" },
  ];

  const quickActions = [
    { icon: Plus, label: "Novo Paciente", path: "/pacientes?action=new", color: "text-blue-500" },
    { icon: Plus, label: "Novo Agendamento", path: "/agenda?action=new", color: "text-purple-500" },
    { icon: Plus, label: "Novo Prontuário", path: "/prontuarios?action=new", color: "text-green-500" },
    { icon: Sparkles, label: "Gerar com IA", path: "/assistente-ia", color: "text-amber-500" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Buscar pacientes, páginas ou ações..." 
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Buscando..." : "Nenhum resultado encontrado."}
        </CommandEmpty>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <CommandGroup heading="Pacientes">
            {searchResults.map((result) => (
              <CommandItem
                key={result.id}
                onSelect={() => handleSelect(`/pacientes/${result.id}`)}
                className="flex items-center gap-3"
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span>{result.title}</span>
                  {result.subtitle && (
                    <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick Actions */}
        {!searchQuery && (
          <>
            <CommandGroup heading="Ações Rápidas">
              {quickActions.map((action) => (
                <CommandItem
                  key={action.path}
                  onSelect={() => handleSelect(action.path)}
                  className="flex items-center gap-3"
                >
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                  <span>{action.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation */}
        <CommandGroup heading="Navegação">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => handleSelect(item.path)}
              keywords={[item.keywords]}
              className="flex items-center gap-3"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
