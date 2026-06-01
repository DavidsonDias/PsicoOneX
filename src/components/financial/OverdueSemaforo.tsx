import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  payment_status?: string;
  status?: string;
  due_date: string;
  paid_date: string | null;
}

interface Props {
  transactions: Transaction[];
  onSync?: () => void;
  syncing?: boolean;
}

export function OverdueSemaforo({ transactions, onSync, syncing }: Props) {
  const stats = useMemo(() => {
    const today = new Date();
    const buckets = { green: 0, yellow: 0, red: 0, greenAmount: 0, yellowAmount: 0, redAmount: 0 };
    transactions.forEach((t) => {
      const status = t.payment_status || t.status;
      if (t.type !== "income" || status === "paid" || status === "cancelled") return;
      const days = differenceInDays(today, new Date(t.due_date));
      if (days <= 0) { buckets.green++; buckets.greenAmount += Number(t.amount); }
      else if (days <= 7) { buckets.yellow++; buckets.yellowAmount += Number(t.amount); }
      else { buckets.red++; buckets.redAmount += Number(t.amount); }
    });
    return buckets;
  }, [transactions]);

  const total = stats.green + stats.yellow + stats.red;
  if (total === 0) return null;

  const items = [
    { label: "Em dia", count: stats.green, amount: stats.greenAmount, color: "bg-green-500/10 text-green-600 border-green-500/30" },
    { label: "Vence em 7d", count: stats.yellow, amount: stats.yellowAmount, color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    { label: "Atrasado", count: stats.red, amount: stats.redAmount, color: "bg-red-500/10 text-red-600 border-red-500/30" },
  ];

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold">Semáforo de Inadimplência</p>
            <Badge variant="secondary" className="text-xs">{total} aberto{total !== 1 ? "s" : ""}</Badge>
          </div>
          {onSync && (
            <Button size="sm" variant="ghost" className="gap-1.5 h-7" onClick={onSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Sincronizar Stripe
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {items.map((i) => (
            <div key={i.label} className={cn("rounded-lg border p-3", i.color)}>
              <p className="text-xs opacity-80">{i.label}</p>
              <p className="text-xl font-bold mt-0.5">{i.count}</p>
              <p className="text-xs opacity-80 mt-0.5">
                R$ {i.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
