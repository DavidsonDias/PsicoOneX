import { memo, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Send } from "lucide-react";
import { format } from "date-fns";
import type { ChatMessage } from "@/hooks/useTelehealthChat";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}

export const ChatPanel = memo(function ChatPanel({ messages, onSend, onClose }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">Chat da sessão</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhuma mensagem ainda</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === "self" ? "items-end" : "items-start"}`}>
            <div
              className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${
                msg.sender === "self"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">
              {msg.senderName} · {format(new Date(msg.timestamp), "HH:mm")}
            </span>
          </div>
        ))}
      </div>

      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Digite uma mensagem..."
          className="text-sm"
        />
        <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
});
