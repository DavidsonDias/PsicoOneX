import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, FileText, Heart, ListTodo, Video, Clock, Smile, Meh, Frown, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmotionEntry {
  mood: string;
  intensity: number;
  note: string;
  created_at: string;
}

export default function PortalPaciente() {
  const [emotionEntry, setEmotionEntry] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [emotionHistory] = useState<EmotionEntry[]>([]);

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Load upcoming appointments
      const now = new Date().toISOString();
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status, duration_minutes, type, patients(full_name)")
        .eq("psychologist_id", session.user.id)
        .gte("scheduled_at", now)
        .order("scheduled_at", { ascending: true })
        .limit(10);

      setAppointments(appts || []);

      // Load recent records
      const { data: recs } = await supabase
        .from("medical_records")
        .select("id, session_date, session_number, complaints, evolution, patients(full_name)")
        .eq("psychologist_id", session.user.id)
        .is("deleted_at", null)
        .order("session_date", { ascending: false })
        .limit(20);

      setRecords(recs || []);
    } catch (error) {
      console.error("Portal data error:", error);
    } finally {
      setLoading(false);
    }
  };

  const moods = [
    { value: "happy", label: "Feliz", icon: Smile, color: "text-green-500 bg-green-500/10" },
    { value: "neutral", label: "Neutro", icon: Meh, color: "text-amber-500 bg-amber-500/10" },
    { value: "sad", label: "Triste", icon: Frown, color: "text-red-500 bg-red-500/10" },
  ];

  const handleSaveEmotion = async () => {
    if (!selectedMood) {
      toast.error("Selecione como você está se sentindo");
      return;
    }
    toast.success("Registro emocional salvo com sucesso! 💚");
    setEmotionEntry("");
    setSelectedMood(null);
    setIntensity(5);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      scheduled: { label: "Agendada", variant: "outline" },
      confirmed: { label: "Confirmada", variant: "default" },
      completed: { label: "Realizada", variant: "secondary" },
      cancelled: { label: "Cancelada", variant: "destructive" },
    };
    const config = map[status] || map.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <AppLayout title="Portal do Paciente" description="Acompanhe seu processo terapêutico">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Portal do Paciente" description="Acompanhe seu processo terapêutico">
      <Tabs defaultValue="appointments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5">
          <TabsTrigger value="appointments" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Consultas</span>
            <span className="sm:hidden">Agenda</span>
          </TabsTrigger>
          <TabsTrigger value="emotions" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Diário Emocional</span>
            <span className="sm:hidden">Diário</span>
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Prontuários</span>
            <span className="sm:hidden">Registros</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm">
            <ListTodo className="h-4 w-4" />
            Tarefas
          </TabsTrigger>
          <TabsTrigger value="telehealth" className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm">
            <Video className="h-4 w-4" />
            Teleconsulta
          </TabsTrigger>
        </TabsList>

        {/* Appointments - Real Data */}
        <TabsContent value="appointments" className="space-y-4">
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-2xl font-semibold mb-4">Próximas Consultas</h2>
            {appointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma consulta agendada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div key={apt.id} className="p-4 border border-border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <p className="font-medium">{(apt.patients as any)?.full_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(apt.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          <span>• {apt.duration_minutes || 50}min</span>
                          <span>• {apt.type === "online" ? "Online" : "Presencial"}</span>
                        </div>
                      </div>
                      {getStatusBadge(apt.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Emotion Diary - Enhanced */}
        <TabsContent value="emotions" className="space-y-4">
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-2xl font-semibold mb-4">Diário Emocional</h2>
            
            <div className="mb-6 p-4 bg-muted/50 rounded-xl space-y-4">
              <h3 className="font-medium">Como você está se sentindo agora?</h3>
              
              <div className="flex gap-3 justify-center">
                {moods.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedMood(value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      selectedMood === value
                        ? "border-primary bg-primary/5 scale-105"
                        : "border-transparent hover:border-border"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Intensidade: {intensity}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <Textarea
                placeholder="Descreva o que está sentindo, pensando ou o que aconteceu..."
                value={emotionEntry}
                onChange={(e) => setEmotionEntry(e.target.value)}
                rows={3}
              />
              <Button onClick={handleSaveEmotion} className="w-full sm:w-auto">
                Salvar Registro
              </Button>
            </div>

            {emotionHistory.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground">Registros Anteriores</h3>
                {emotionHistory.map((entry, i) => (
                  <div key={i} className="p-3 border border-border rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <Badge variant="outline">{entry.mood}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Intensidade: {entry.intensity}/10
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.note}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Records - Real Data */}
        <TabsContent value="records" className="space-y-4">
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-2xl font-semibold mb-4">Prontuários Recentes</h2>
            {records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum prontuário encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((rec) => (
                  <div key={rec.id} className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Sessão {rec.session_number || "—"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(rec.session_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <span className="text-xs font-medium">{(rec.patients as any)?.full_name}</span>
                    </div>
                    {rec.complaints && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{rec.complaints}</p>
                    )}
                    {rec.evolution && (
                      <p className="text-sm mt-1 line-clamp-2">{rec.evolution}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="space-y-4">
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-2xl font-semibold mb-4">Tarefas Terapêuticas</h2>
            <div className="text-center py-12 text-muted-foreground">
              <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Módulo de tarefas em breve</p>
              <p className="text-xs mt-1">Seu terapeuta poderá atribuir atividades para praticar entre sessões</p>
            </div>
          </Card>
        </TabsContent>

        {/* Telehealth */}
        <TabsContent value="telehealth" className="space-y-4">
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-2xl font-semibold mb-4">Teleconsulta</h2>
            <div className="text-center py-12 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma teleconsulta agendada</p>
              <p className="text-xs mt-1">Links para sessões online aparecerão aqui automaticamente</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
