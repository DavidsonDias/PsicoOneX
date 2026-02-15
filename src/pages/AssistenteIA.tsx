import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Brain, Sparkles, User, Loader2, 
  Lightbulb, FileText, Calendar, Users,
  Copy, Check, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

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
  { icon: FileText, label: "Resumo de prontuário", prompt: "Como devo estruturar um resumo de evolução clínica para um paciente com transtorno de ansiedade?" },
  { icon: Calendar, label: "Organizar agenda", prompt: "Qual a melhor forma de organizar minha agenda semanal para evitar sobrecarga e burnout?" },
  { icon: Users, label: "Técnicas terapêuticas", prompt: "Quais são as principais técnicas de TCC para tratamento de depressão moderada?" },
  { icon: Lightbulb, label: "Ideias para sessão", prompt: "Sugira atividades interativas para sessões com adolescentes resistentes à terapia." },
];

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`;

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

    const allMessages = [...messages, userMessage];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: assistantSoFar, timestamp: new Date() }];
      });
    };

    try {
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (resp.status === 429) {
        toast.error("Limite de requisições excedido. Tente novamente em instantes.");
        setIsLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("Créditos de IA esgotados. Adicione créditos ao workspace.");
        setIsLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        toast.error("Erro ao conectar com IA");
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao comunicar com IA");
    }

    setIsLoading(false);
  };

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => setMessages([]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <AppLayout title="Assistente IA" description="Seu parceiro inteligente para a prática clínica">
      <div className="grid lg:grid-cols-[1fr,320px] gap-6 h-[calc(100vh-200px)]">
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
                    <Badge variant="secondary" className="text-[10px]">Powered by AI</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Assistente especializado em psicologia</p>
                </div>
              </div>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClear} className="gap-2 text-muted-foreground">
                  <RotateCcw className="h-4 w-4" /> Limpar
                </Button>
              )}
            </div>
          </CardHeader>

          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Olá! Sou o PsicoAI 👋</h3>
                    <p className="text-muted-foreground max-w-md">
                      Estou aqui para auxiliar em questões clínicas, sugerir técnicas terapêuticas e ajudar com a documentação.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {suggestions.map((s) => (
                      <motion.button key={s.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => handleSuggestionClick(s.prompt)}
                        className="flex items-center gap-2 px-3 py-2 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm">
                        <s.icon className="h-4 w-4 text-primary" />
                        <span>{s.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-primary/20 to-purple-500/20")}>
                        {message.role === "user" ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4 text-primary" />}
                      </div>
                      <div className={cn("max-w-[80%] rounded-2xl px-4 py-3",
                        message.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm")}>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        {message.role === "assistant" && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(message.content, message.id)}>
                              {copiedId === message.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && !messages.find(m => m.role === "assistant" && m.id === (Date.now() + 1).toString()) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Pensando...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Digite sua pergunta..." className="min-h-[50px] max-h-[150px] resize-none" disabled={isLoading} />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading} className="shrink-0">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              PsicoAI pode cometer erros. Verifique informações importantes.
            </p>
          </div>
        </Card>

        <div className="space-y-4 hidden lg:block">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Tópicos Populares</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {["Técnicas de TCC", "Manejo de crises", "Psicoeducação", "Documentação clínica", "Ética profissional"].map((topic) => (
                <button key={topic} onClick={() => handleSuggestionClick(`Fale sobre ${topic} na prática clínica`)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm">{topic}</button>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <Sparkles className="h-8 w-8 text-primary mx-auto" />
                <div>
                  <h4 className="font-semibold">Dica Pro</h4>
                  <p className="text-xs text-muted-foreground mt-1">Seja específico nas suas perguntas para receber respostas mais precisas e úteis.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}