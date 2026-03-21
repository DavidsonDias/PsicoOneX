import { cn } from "@/lib/utils";

const statuses = [
  { label: "Agendado", color: "bg-blue-500" },
  { label: "Confirmado", color: "bg-green-500" },
  { label: "Realizado", color: "bg-purple-500" },
  { label: "Cancelado", color: "bg-destructive" },
  { label: "Remarcado", color: "bg-orange-500" },
  { label: "Não compareceu", color: "bg-amber-500" },
];

export function StatusLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground", className)}>
      {statuses.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
