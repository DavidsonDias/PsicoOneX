import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Brain, Sparkles, User, Loader2, 
  Lightbulb, FileText, Calendar, Users,
  Mic, MicOff, Copy, Check, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SuggestionChip {
  icon: React.ElementType;
  label: string;
  prompt: string;
}

const suggestions: SuggestionChip[] = [
  {
    icon: FileText,
    label: "Resumo de prontuário",
    prompt: "Como devo estruturar um resumo de evolução clínica para um paciente com transtorno de ansiedade?"
  },
  {
    icon: Calendar,
    label: "Organizar agenda",
    prompt: "Qual a melhor forma de organizar minha agenda semanal para evitar sobrecarga e burnout?"
  },
  {
    icon: Users,
    label: "Técnicas terapêuticas",
    prompt: "Quais são as principais técnicas de TCC para tratamento de depressão moderada?"
  },
  {
    icon: Lightbulb,
    label: "Ideias para sessão",
    prompt: "Sugira atividades interativas para sessões com adolescentes resistentes à terapia."
  },
];

export default function AssistenteIA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (in production, this would call an edge function)
    setTimeout(() => {
      const responses = [
        "Excelente pergunta! Com base nas melhores práticas clínicas, recomendo estruturar sua abordagem em três etapas:\n\n1. **Avaliação inicial**: Realize uma anamnese completa, identificando histórico, sintomas atuais e fatores desencadeantes.\n\n2. **Planejamento terapêutico**: Defina objetivos claros e mensuráveis em conjunto com o paciente.\n\n3. **Acompanhamento**: Utilize escalas validadas para monitorar a evolução e ajustar o tratamento conforme necessário.",
        "Esta é uma questão importante na prática clínica. Sugiro considerar os seguintes pontos:\n\n• **Escuta ativa**: Mantenha-se presente e empático durante toda a sessão\n• **Psicoeducação**: Explique ao paciente o que está acontecendo de forma acessível\n• **Técnicas baseadas em evidências**: Utilize intervenções validadas cientificamente\n• **Autoavaliação**: Reserve tempo para supervisão e autocuidado",
        "Para otimizar sua prática clínica, considere implementar as seguintes estratégias:\n\n🎯 **Gestão do tempo**: Defina intervalos adequados entre sessões\n📝 **Documentação eficiente**: Utilize templates para agilizar registros\n🧘 **Autocuidado**: Pratique técnicas de mindfulness entre atendimentos\n📊 **Métricas**: Acompanhe indicadores de evolução dos pacientes",
      ];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success("Copiado para a área de transferência");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AppLayout title="Assistente IA" description="Seu parceiro inteligente para a prática clínica">
      <div className="grid lg:grid-cols-[1fr,320px] gap-6 h-[calc(100vh-200px)]">
        {/* Main Chat Area */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="border-b border-border py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    PsicoAI
                    <Badge variant="secondary" className="text-[10px]">Beta</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Assistente especializado em psicologia
                  </p>
                </div>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="gap-2 text-muted-foreground"
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto">
                      <Sparkles className="w-10 h-10 text-primary" />
                    </div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0"
                    >
                      <div className="w-3 h-3 rounded-full bg-primary absolute -top-1 left-1/2 -translate-x-1/2" />
                    </motion.div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Olá! Sou o PsicoAI 👋
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      Estou aqui para auxiliar em questões clínicas, sugerir técnicas terapêuticas e ajudar com a documentação de prontuários.
                    </p>
                  </div>
                  
                  {/* Suggestion chips */}
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {suggestions.map((suggestion) => (
                      <motion.button
                        key={suggestion.label}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSuggestionClick(suggestion.prompt)}
                        className="flex items-center gap-2 px-3 py-2 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm"
                      >
                        <suggestion.icon className="h-4 w-4 text-primary" />
                        <span>{suggestion.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" && "flex-row-reverse"
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-gradient-to-br from-primary/20 to-purple-500/20"
                        )}
                      >
                        {message.role === "user" ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Brain className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-3",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted rounded-tl-sm"
                        )}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {message.content.split("\n").map((line, i) => (
                            <p key={i} className={cn(i > 0 && "mt-2")}>
                              {line}
                            </p>
                          ))}
                        </div>
                        {message.role === "assistant" && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopy(message.content, message.id)}
                            >
                              {copiedId === message.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Pensando...
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input area */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua pergunta..."
                className="min-h-[50px] max-h-[150px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              O PsicoAI pode cometer erros. Verifique informações importantes.
            </p>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4 hidden lg:block">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tópicos Populares</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                "Técnicas de TCC",
                "Manejo de crises",
                "Psicoeducação",
                "Documentação clínica",
                "Ética profissional",
              ].map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleSuggestionClick(`Fale sobre ${topic} na prática clínica`)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  {topic}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <Sparkles className="h-8 w-8 text-primary mx-auto" />
                <div>
                  <h4 className="font-semibold">Dica Pro</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Seja específico nas suas perguntas para receber respostas mais precisas e úteis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
