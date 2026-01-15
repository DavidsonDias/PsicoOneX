import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ClipboardList, 
  Play, 
  CheckCircle2, 
  AlertTriangle,
  History,
  TrendingUp,
  Brain,
  Heart,
  Activity,
  FileText,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// PHQ-9 Depression Scale
const PHQ9_QUESTIONS = [
  "Pouco interesse ou pouco prazer em fazer as coisas",
  "Se sentir 'para baixo', deprimido(a) ou sem perspectiva",
  "Dificuldade para pegar no sono ou permanecer dormindo, ou dormir mais do que de costume",
  "Se sentir cansado(a) ou com pouca energia",
  "Falta de apetite ou comendo demais",
  "Se sentir mal consigo mesmo(a) — ou achar que você é um fracasso ou que decepcionou sua família ou você mesmo(a)",
  "Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão",
  "Lentidão para se movimentar ou falar, a ponto das outras pessoas perceberem? Ou o oposto – Loss tão agitado(a) ou inquieto(a) que você fica andando de um lado para o outro muito mais do que de costume",
  "Pensar em se ferir de alguma maneira ou que seria melhor estar morto(a)",
];

const PHQ9_OPTIONS = [
  { value: 0, label: "Nenhuma vez" },
  { value: 1, label: "Vários dias" },
  { value: 2, label: "Mais da metade dos dias" },
  { value: 3, label: "Quase todos os dias" },
];

// GAD-7 Anxiety Scale
const GAD7_QUESTIONS = [
  "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)",
  "Não ser capaz de impedir ou de controlar as preocupações",
  "Preocupar-se muito com diversas coisas",
  "Dificuldade para relaxar",
  "Ficar tão agitado(a) que se torna difícil permanecer sentado(a)",
  "Ficar facilmente aborrecido(a) ou irritado(a)",
  "Sentir medo como se algo horrível fosse acontecer",
];

interface Scale {
  id: string;
  name: string;
  description: string;
  questions: string[];
  options: { value: number; label: string }[];
  icon: React.ElementType;
  color: string;
  interpretation: (score: number) => { level: string; color: string; description: string };
}

const SCALES: Scale[] = [
  {
    id: "phq9",
    name: "PHQ-9",
    description: "Questionário sobre a Saúde do Paciente - Avaliação de Depressão",
    questions: PHQ9_QUESTIONS,
    options: PHQ9_OPTIONS,
    icon: Brain,
    color: "text-blue-500",
    interpretation: (score) => {
      if (score <= 4) return { level: "Mínimo", color: "bg-green-500", description: "Sintomas mínimos de depressão" };
      if (score <= 9) return { level: "Leve", color: "bg-yellow-500", description: "Sintomas leves de depressão" };
      if (score <= 14) return { level: "Moderado", color: "bg-orange-500", description: "Sintomas moderados de depressão" };
      if (score <= 19) return { level: "Moderadamente Severo", color: "bg-red-400", description: "Sintomas moderadamente severos" };
      return { level: "Severo", color: "bg-red-600", description: "Sintomas severos de depressão" };
    },
  },
  {
    id: "gad7",
    name: "GAD-7",
    description: "Escala de Transtorno de Ansiedade Generalizada",
    questions: GAD7_QUESTIONS,
    options: PHQ9_OPTIONS,
    icon: Heart,
    color: "text-purple-500",
    interpretation: (score) => {
      if (score <= 4) return { level: "Mínimo", color: "bg-green-500", description: "Ansiedade mínima" };
      if (score <= 9) return { level: "Leve", color: "bg-yellow-500", description: "Ansiedade leve" };
      if (score <= 14) return { level: "Moderado", color: "bg-orange-500", description: "Ansiedade moderada" };
      return { level: "Severo", color: "bg-red-600", description: "Ansiedade severa" };
    },
  },
];

interface Patient {
  id: string;
  full_name: string;
}

export default function EscalasPsicologicas() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [selectedScale, setSelectedScale] = useState<Scale | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");
    
    if (data) setPatients(data);
  };

  const startScale = (scale: Scale) => {
    if (!selectedPatient) {
      toast.error("Selecione um paciente primeiro");
      return;
    }
    setSelectedScale(scale);
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResult(false);
    setIsApplying(true);
  };

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);

    if (currentQuestion < (selectedScale?.questions.length || 0) - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      setShowResult(true);
    }
  };

  const calculateScore = () => {
    return answers.reduce((sum, answer) => sum + (answer || 0), 0);
  };

  const resetScale = () => {
    setIsApplying(false);
    setSelectedScale(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResult(false);
  };

  const saveResult = async () => {
    if (!selectedScale || !selectedPatient) return;

    const score = calculateScore();
    const interpretation = selectedScale.interpretation(score);

    toast.success(`Resultado do ${selectedScale.name} salvo com sucesso!`, {
      description: `Pontuação: ${score} - ${interpretation.level}`,
    });

    resetScale();
  };

  const progress = selectedScale 
    ? ((currentQuestion + 1) / selectedScale.questions.length) * 100 
    : 0;

  return (
    <AppLayout 
      title="Escalas Psicológicas" 
      description="Aplique e gerencie testes e escalas validadas"
    >
      <Tabs defaultValue="apply" className="space-y-6">
        <TabsList>
          <TabsTrigger value="apply" className="gap-2">
            <Play className="h-4 w-4" />
            Aplicar Escala
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Análise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apply" className="space-y-6">
          <AnimatePresence mode="wait">
            {!isApplying ? (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Patient Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      Selecione o Paciente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                      <SelectTrigger className="w-full max-w-md">
                        <SelectValue placeholder="Escolha um paciente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Scales Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {SCALES.map((scale, index) => (
                    <motion.div
                      key={scale.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/50">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-muted ${scale.color}`}>
                              <scale.icon className="h-6 w-6" />
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {scale.questions.length} questões
                            </Badge>
                          </div>
                          <CardTitle className="mt-4">{scale.name}</CardTitle>
                          <CardDescription>{scale.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            variant="outline"
                            onClick={() => startScale(scale)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Aplicar Escala
                            <ChevronRight className="h-4 w-4 ml-auto group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}

                  {/* Coming Soon Cards */}
                  {["BDI-II", "BAI", "DASS-21"].map((name, index) => (
                    <motion.div
                      key={name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (SCALES.length + index) * 0.1 }}
                    >
                      <Card className="opacity-60 cursor-not-allowed">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted text-muted-foreground">
                              <Activity className="h-6 w-6" />
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Em breve
                            </Badge>
                          </div>
                          <CardTitle className="mt-4">{name}</CardTitle>
                          <CardDescription>Escala será disponibilizada em breve</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button className="w-full" variant="outline" disabled>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Em Desenvolvimento
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="applying"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {selectedScale && <selectedScale.icon className={`h-5 w-5 ${selectedScale.color}`} />}
                          {selectedScale?.name}
                        </CardTitle>
                        <CardDescription>
                          {showResult ? "Resultado" : `Questão ${currentQuestion + 1} de ${selectedScale?.questions.length}`}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" onClick={resetScale}>
                        Cancelar
                      </Button>
                    </div>
                    {!showResult && (
                      <Progress value={progress} className="mt-4" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <AnimatePresence mode="wait">
                      {!showResult ? (
                        <motion.div
                          key={currentQuestion}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-6"
                        >
                          <p className="text-lg font-medium">
                            {selectedScale?.questions[currentQuestion]}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Nas últimas 2 semanas, com que frequência você foi incomodado(a) por:
                          </p>
                          <RadioGroup
                            value={answers[currentQuestion]?.toString()}
                            onValueChange={(val) => handleAnswer(parseInt(val))}
                            className="space-y-3"
                          >
                            {selectedScale?.options.map((option) => (
                              <motion.div
                                key={option.value}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Label
                                  htmlFor={`option-${option.value}`}
                                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all"
                                >
                                  <RadioGroupItem value={option.value.toString()} id={`option-${option.value}`} />
                                  <span>{option.label}</span>
                                </Label>
                              </motion.div>
                            ))}
                          </RadioGroup>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="result"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center space-y-6"
                        >
                          {selectedScale && (
                            <>
                              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary text-white text-3xl font-bold">
                                {calculateScore()}
                              </div>
                              <div>
                                <Badge className={`${selectedScale.interpretation(calculateScore()).color} text-white text-lg px-4 py-1`}>
                                  {selectedScale.interpretation(calculateScore()).level}
                                </Badge>
                                <p className="mt-3 text-muted-foreground">
                                  {selectedScale.interpretation(calculateScore()).description}
                                </p>
                              </div>
                              <div className="flex gap-3 justify-center pt-4">
                                <Button variant="outline" onClick={resetScale}>
                                  Nova Aplicação
                                </Button>
                                <Button onClick={saveResult}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Salvar Resultado
                                </Button>
                              </div>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Aplicações</CardTitle>
              <CardDescription>Visualize todas as escalas aplicadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma escala aplicada ainda</p>
                <p className="text-sm">As aplicações aparecerão aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Evolução</CardTitle>
              <CardDescription>Acompanhe a evolução dos pacientes ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Dados insuficientes para análise</p>
                <p className="text-sm">Aplique mais escalas para visualizar tendências</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
