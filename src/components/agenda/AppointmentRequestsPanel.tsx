import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, RefreshCw, MessageSquare, XCircle, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppointmentRequests } from "@/hooks/useAppointmentRequests";

interface Props {
  psychologistId: string | undefined;
}

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  cancel: { icon: XCircle, label: "Cancelamento", color: "text-destructive bg-destructive/10" },
  reschedule: { icon: RefreshCw, label: "Reagendamento", color: "text-orange-600 bg-orange-500/10" },
  message: { icon: MessageSquare, label: "Mensagem", color: "text-blue-600 bg-blue-500/10" },
  confirm: { icon: Check, label: "Confirmação", color: "text-green-600 bg-green-500/10" },
};

export function AppointmentRequestsPanel({ psychologistId }: Props) {
  const { requests, pendingCount, approveReschedule, rejectRequest, acknowledge } =
    useAppointmentRequests(psychologistId);
  const [busy, setBusy] = useState<string | null>(null);

  if (pendingCount === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">
            {pendingCount} solicitação{pendingCount > 1 ? "ões" : ""} pendente{pendingCount > 1 ? "s" : ""}
          </h3>
          <Badge variant="default" className="text-[10px] h-4">{pendingCount}</Badge>
        </div>
        <div className="space-y-2">
          <AnimatePresence>
            {requests.map((req) => {
              const cfg = TYPE_CONFIG[req.request_type] || TYPE_CONFIG.message;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-background rounded-lg border p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{req.patient_name || "Paciente"}</span>
                        <Badge variant="outline" className="text-[10px] h-4">{cfg.label}</Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {format(new Date(req.created_at), "dd/MM HH:mm")}
                        </span>
                      </div>
                      {req.proposed_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Nova data:{" "}
                          <span className="font-medium text-foreground">
                            {format(new Date(req.proposed_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </p>
                      )}
                      {req.reason && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{req.reason}"</p>
                      )}
                      {req.message && (
                        <p className="text-xs mt-1 bg-muted/50 rounded p-2">{req.message}</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-2">
                        {req.request_type === "reschedule" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs gap-1"
                              disabled={busy === req.id}
                              onClick={async () => {
                                setBusy(req.id);
                                await approveReschedule(req);
                                setBusy(null);
                              }}
                            >
                              {busy === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              disabled={busy === req.id}
                              onClick={async () => {
                                setBusy(req.id);
                                await rejectRequest(req.id);
                                setBusy(null);
                              }}
                            >
                              <X className="h-3 w-3" />
                              Recusar
                            </Button>
                          </>
                        )}
                        {(req.request_type === "message" || req.request_type === "cancel") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            disabled={busy === req.id}
                            onClick={async () => {
                              setBusy(req.id);
                              await acknowledge(req.id);
                              setBusy(null);
                            }}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Marcar como lida
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
