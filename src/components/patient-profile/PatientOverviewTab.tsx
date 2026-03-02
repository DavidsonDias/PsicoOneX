import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Calendar, User, AlertCircle, Clock, DollarSign, CalendarCheck } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PatientFull } from "@/pages/PatientProfile";

interface Props {
  patient: PatientFull;
}

interface OverviewData {
  lastAppointment: string | null;
  nextAppointment: string | null;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalSessions: number;
}

export function PatientOverviewTab({ patient }: Props) {
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    loadOverview();
  }, [patient.id]);

  const loadOverview = async () => {
    const now = new Date().toISOString();

    const [aptsResult, financialResult, recordsResult] = await Promise.all([
      supabase
        .from("appointments")
        .select("scheduled_at, status")
        .eq("patient_id", patient.id)
        .is("deleted_at", null)
        .order("scheduled_at", { ascending: false }),
      supabase
        .from("financial_transactions")
        .select("amount, status, due_date")
        .eq("patient_id", patient.id)
        .is("deleted_at", null),
      supabase
        .from("medical_records")
        .select("id")
        .eq("patient_id", patient.id)
        .is("deleted_at", null),
    ]);

    const apts = aptsResult.data || [];
    const txs = financialResult.data || [];
    const records = recordsResult.data || [];

    const completedApts = apts.filter(a => a.status === "completed");
    const lastApt = completedApts.length > 0 ? completedApts[0].scheduled_at : null;
    const futureApts = apts.filter(a => a.scheduled_at > now && a.status !== "cancelled");
    const nextApt = futureApts.length > 0 ? futureApts[futureApts.length - 1].scheduled_at : null;

    const totalPaid = txs.filter(t => t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
    const pendingTxs = txs.filter(t => t.status === "pending");
    const totalPending = pendingTxs.reduce((s, t) => s + Number(t.amount), 0);
    const totalOverdue = pendingTxs.filter(t => t.due_date && new Date(t.due_date) < new Date()).reduce((s, t) => s + Number(t.amount), 0);

    setData({
      lastAppointment: lastApt,
      nextAppointment: nextApt,
      totalPaid,
      totalPending,
      totalOverdue,
      totalSessions: records.length,
    });
  };

  const age = patient.birth_date
    ? differenceInYears(new Date(), new Date(patient.birth_date))
    : null;

  const financialStatus = data
    ? data.totalOverdue > 0 ? "overdue" : data.totalPending > 0 ? "pending" : "ok"
    : "ok";

  const financialBadge = {
    ok: { label: "Em dia", variant: "default" as const },
    pending: { label: "Pendente", variant: "secondary" as const },
    overdue: { label: "Atrasado", variant: "destructive" as const },
  }[financialStatus];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {patient.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-sm">{patient.email}</span>
            </div>
          )}
          {patient.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm">{patient.phone}</span>
            </div>
          )}
          {patient.address && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm">{patient.address}</span>
            </div>
          )}
          {!patient.email && !patient.phone && !patient.address && (
            <p className="text-sm text-muted-foreground italic">Nenhum contato registrado</p>
          )}
        </CardContent>
      </Card>

      {/* Personal Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Dados Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {patient.birth_date && (
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm">
                {format(new Date(patient.birth_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {age !== null && ` (${age} anos)`}
              </span>
            </div>
          )}
          {patient.cpf && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm">CPF: {patient.cpf}</span>
            </div>
          )}
          {patient.treatment_start_date && (
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Início: {format(new Date(patient.treatment_start_date), "dd/MM/yyyy")}
              </span>
            </div>
          )}
          {patient.default_session_value && (
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm">Valor da sessão: R$ {Number(patient.default_session_value).toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clinical Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Resumo Clínico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm">Última sessão</span>
            </div>
            <span className="text-sm font-medium">
              {data?.lastAppointment
                ? format(new Date(data.lastAppointment), "dd/MM/yyyy", { locale: ptBR })
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm">Próxima sessão</span>
            </div>
            <span className="text-sm font-medium">
              {data?.nextAppointment
                ? format(new Date(data.nextAppointment), "dd/MM/yyyy HH:mm", { locale: ptBR })
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Total de prontuários</span>
            <Badge variant="secondary">{data?.totalSessions ?? 0}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Situação Financeira</CardTitle>
            <Badge variant={financialBadge.variant}>{financialBadge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Total pago</span>
            <span className="text-sm font-medium text-green-600">
              R$ {(data?.totalPaid ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Pendente</span>
            <span className="text-sm font-medium text-amber-600">
              R$ {(data?.totalPending ?? 0).toFixed(2)}
            </span>
          </div>
          {(data?.totalOverdue ?? 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-destructive">Atrasado</span>
              <span className="text-sm font-medium text-destructive">
                R$ {data!.totalOverdue.toFixed(2)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      {(patient.emergency_contact || patient.emergency_phone) && (
        <Card className="border-amber-500/30 bg-amber-500/5 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Contato de Emergência
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6">
            {patient.emergency_contact && <span className="text-sm">{patient.emergency_contact}</span>}
            {patient.emergency_phone && <span className="text-sm text-muted-foreground">{patient.emergency_phone}</span>}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {patient.notes && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{patient.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
