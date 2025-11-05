import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { Calendar, FileText, Heart, ListTodo, Video } from "lucide-react";

export default function PortalPaciente() {
  const [emotionEntry, setEmotionEntry] = useState("");
  const [taskNote, setTaskNote] = useState("");

  const upcomingAppointments = [
    {
      id: 1,
      date: "2025-11-10",
      time: "14:00",
      psychologist: "Dra. Maria Silva",
      type: "Presencial"
    }
  ];

  const tasks = [
    {
      id: 1,
      title: "Diário de gratidão",
      description: "Escrever 3 coisas pelas quais é grato hoje",
      dueDate: "2025-11-08",
      completed: false
    },
    {
      id: 2,
      title: "Exercício de respiração",
      description: "Praticar respiração profunda por 5 minutos",
      dueDate: "2025-11-07",
      completed: true
    }
  ];

  const emotionDiary = [
    {
      id: 1,
      date: "2025-11-05",
      mood: "Ansioso",
      intensity: 7,
      note: "Preocupado com apresentação do trabalho"
    },
    {
      id: 2,
      date: "2025-11-04",
      mood: "Calmo",
      intensity: 4,
      note: "Dia tranquilo, consegui meditar"
    }
  ];

  const handleSaveEmotion = () => {
    if (!emotionEntry.trim()) {
      toast({
        title: "Atenção",
        description: "Por favor, descreva como você está se sentindo",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Registro salvo",
      description: "Seu registro emocional foi salvo com sucesso",
    });
    setEmotionEntry("");
  };

  const handleCompleteTask = (taskId: number) => {
    toast({
      title: "Tarefa concluída",
      description: "Parabéns por completar a tarefa!",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Portal do Paciente</h1>
          <p className="text-muted-foreground">Acompanhe seu processo terapêutico</p>
        </div>

        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Consultas
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Tarefas
            </TabsTrigger>
            <TabsTrigger value="emotions" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Diário Emocional
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="telehealth" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Teleconsulta
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Próximas Consultas</h2>
              <div className="space-y-3">
                {upcomingAppointments.map(apt => (
                  <div key={apt.id} className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{apt.psychologist}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(apt.date).toLocaleDateString('pt-BR')} às {apt.time}
                        </p>
                        <p className="text-sm text-muted-foreground">{apt.type}</p>
                      </div>
                      <Button variant="outline">Detalhes</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Minhas Tarefas Terapêuticas</h2>
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{task.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Prazo: {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Button
                        variant={task.completed ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={task.completed}
                      >
                        {task.completed ? "Concluída" : "Marcar como concluída"}
                      </Button>
                    </div>
                    {!task.completed && (
                      <div className="mt-3">
                        <Textarea
                          placeholder="Adicione suas anotações sobre a tarefa..."
                          value={taskNote}
                          onChange={(e) => setTaskNote(e.target.value)}
                          className="mb-2"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="emotions" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Diário Emocional</h2>
              
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-3">Como você está se sentindo hoje?</h3>
                <Textarea
                  placeholder="Descreva suas emoções, pensamentos e o que aconteceu hoje..."
                  value={emotionEntry}
                  onChange={(e) => setEmotionEntry(e.target.value)}
                  className="mb-3"
                  rows={4}
                />
                <Button onClick={handleSaveEmotion}>Salvar Registro</Button>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">Registros Anteriores</h3>
                {emotionDiary.map(entry => (
                  <div key={entry.id} className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{entry.mood}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-sm">
                        Intensidade: <span className="font-medium">{entry.intensity}/10</span>
                      </div>
                    </div>
                    <p className="text-sm">{entry.note}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Meus Documentos</h2>
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum documento disponível no momento</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="telehealth" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Teleconsulta</h2>
              <div className="text-center py-12">
                <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Nenhuma consulta online agendada</p>
                <Button variant="outline">Agendar Teleconsulta</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
