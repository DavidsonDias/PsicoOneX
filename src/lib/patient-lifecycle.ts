export type LifecycleStatus =
  | "active"
  | "paused"
  | "discharged"
  | "referred"
  | "dropout"
  | "closed"
  | "archived";

export interface LifecycleMeta {
  value: LifecycleStatus;
  label: string;
  description: string;
  className: string; // badge classes
  dot: string;
  requiresReason?: boolean;
}

export const LIFECYCLE_STATUSES: LifecycleMeta[] = [
  {
    value: "active",
    label: "Ativo",
    description: "Em atendimento regular",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  {
    value: "paused",
    label: "Pausado",
    description: "Tratamento temporariamente suspenso",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    dot: "bg-amber-500",
    requiresReason: true,
  },
  {
    value: "discharged",
    label: "Alta Clínica",
    description: "Tratamento concluído com alta",
    className: "bg-sky-500/10 text-sky-600 border-sky-500/30",
    dot: "bg-sky-500",
    requiresReason: true,
  },
  {
    value: "referred",
    label: "Encaminhado",
    description: "Encaminhado a outro profissional",
    className: "bg-violet-500/10 text-violet-600 border-violet-500/30",
    dot: "bg-violet-500",
    requiresReason: true,
  },
  {
    value: "dropout",
    label: "Abandono",
    description: "Paciente abandonou o tratamento",
    className: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    dot: "bg-orange-500",
    requiresReason: true,
  },
  {
    value: "closed",
    label: "Encerrado",
    description: "Vínculo terapêutico encerrado",
    className: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    dot: "bg-rose-500",
    requiresReason: true,
  },
  {
    value: "archived",
    label: "Arquivado",
    description: "Mantido apenas para histórico",
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
];

export function getLifecycleMeta(status: string | null | undefined): LifecycleMeta {
  return (
    LIFECYCLE_STATUSES.find((s) => s.value === status) ?? LIFECYCLE_STATUSES[0]
  );
}
