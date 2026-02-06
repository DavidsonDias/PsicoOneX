import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  FileText, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  date: Date;
  sessionNumber: number;
  mood?: "positive" | "neutral" | "negative";
  highlights: string[];
  techniques: string[];
}

interface PatientTimelineProps {
  patientName: string;
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
}

const moodConfig = {
  positive: { icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
  neutral: { icon: Minus, color: "text-amber-500", bg: "bg-amber-500/10" },
  negative: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10" },
};

export function PatientTimeline({ patientName, events, onEventClick }: PatientTimelineProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de {patientName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de {patientName}
          </div>
          <Badge variant="secondary">{events.length} sessões</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-4">
              {events.map((event, index) => {
                const MoodIcon = event.mood ? moodConfig[event.mood].icon : Minus;
                const moodColor = event.mood ? moodConfig[event.mood].color : "text-muted-foreground";
                const moodBg = event.mood ? moodConfig[event.mood].bg : "bg-muted";
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative pl-10 cursor-pointer group"
                    onClick={() => onEventClick?.(event)}
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-2 w-5 h-5 rounded-full ${moodBg} flex items-center justify-center ring-4 ring-background`}>
                      <MoodIcon className={`h-3 w-3 ${moodColor}`} />
                    </div>
                    
                    <div className="p-3 rounded-lg border border-border group-hover:border-primary/50 group-hover:bg-muted/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Sessão {event.sessionNumber}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(event.date, "dd MMM yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      
                      {event.highlights.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground mb-1">Destaques:</p>
                          <ul className="text-sm space-y-1">
                            {event.highlights.slice(0, 2).map((h, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                                <span className="text-muted-foreground">{h}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {event.techniques.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {event.techniques.map((tech) => (
                            <Badge key={tech} variant="secondary" className="text-[10px]">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
