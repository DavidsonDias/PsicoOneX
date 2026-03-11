import { useState } from "react";
import { motion } from "framer-motion";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Check,
  Sparkles,
  CreditCard,
  Clock,
  Shield,
  ArrowRight,
  FileText,
  Download,
  Star,
  Loader2,
} from "lucide-react";
import { PLANS, PLAN_LABELS } from "@/lib/plans";

interface SubscriptionCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SubscriptionCenterContent({ onClose }: { onClose: () => void }) {
  const { subscription, loading, isTrial, isExpired, isBlocked, trialDaysRemaining, isActive } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleChoosePlan = async (priceId: string, planId: string) => {
    setCheckoutLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Não foi possível iniciar o checkout.", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Não foi possível abrir o portal.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-1">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const currentPlanLabel = subscription ? PLAN_LABELS[subscription.plan] || subscription.plan : "Trial";

  const statusConfig = (() => {
    if (isExpired) return { label: "Expirado", color: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" };
    if (isBlocked) return { label: "Suspenso", color: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" };
    if (isTrial) return { label: "Trial Ativo", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", dot: "bg-amber-500" };
    if (isActive) return { label: "Ativo", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", dot: "bg-emerald-500" };
    return { label: "Inativo", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" };
  })();

  return (
    <div className="space-y-8 pb-4">
      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5 space-y-4"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Plano atual</p>
            <h3 className="text-xl font-bold mt-1">Plano {currentPlanLabel}</h3>
          </div>
          <Badge variant="outline" className={cn("gap-1.5 px-3 py-1 text-xs font-medium", statusConfig.color)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />
            {statusConfig.label}
          </Badge>
        </div>

        {isTrial && (
          <div className="flex items-center gap-3 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''} restante{trialDaysRemaining !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">Escolha um plano para continuar usando o PsicoOne.</p>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="flex items-center gap-3 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
            <Shield className="h-4 w-4 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Seu período de teste expirou</p>
              <p className="text-xs text-muted-foreground">Seus dados estão seguros. Ative um plano para continuar.</p>
            </div>
          </div>
        )}

        {isActive && !isTrial && subscription && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Período</p>
              <p className="text-sm font-medium mt-0.5">Mensal</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Próxima cobrança</p>
              <p className="text-sm font-medium mt-0.5">
                {subscription.plan_expires_at
                  ? new Date(subscription.plan_expires_at).toLocaleDateString('pt-BR')
                  : '—'}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Plans */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-bold">Escolha seu plano</h3>
          <p className="text-sm text-muted-foreground">Encontre o plano ideal para sua prática.</p>
        </div>

        <div className="grid gap-4">
          {PLANS.map((plan, index) => {
            const Icon = plan.icon;
            const isCurrent = subscription?.plan === plan.id;
            const isLoading = checkoutLoading === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.08 }}
                className={cn(
                  "relative rounded-xl border p-5 transition-all duration-300 hover:shadow-lg",
                  plan.popular ? cn("shadow-md", plan.borderColor) : "border-border hover:border-muted-foreground/30",
                  isCurrent && "ring-2 ring-primary/50"
                )}
              >
                <div className={cn("absolute inset-0 rounded-xl bg-gradient-to-br opacity-30", plan.gradient)} />

                <div className="relative space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center bg-background/80 border border-border", plan.iconColor)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base">{plan.name}</h4>
                          {plan.popular && (
                            <Badge className="bg-gradient-primary text-primary-foreground text-[10px] px-1.5 py-0">
                              Popular
                            </Badge>
                          )}
                          {isCurrent && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Atual
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className={cn("h-3.5 w-3.5 shrink-0", plan.iconColor)} />
                        <span className="text-xs text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant={plan.popular ? "hero" : "outline"}
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={isCurrent || isLoading}
                    onClick={() => handleChoosePlan(plan.stripePriceId, plan.id)}
                  >
                    {isLoading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirecionando...</>
                    ) : isCurrent ? (
                      "Plano atual"
                    ) : (
                      <>{isActive && !isTrial ? "Alterar plano" : "Escolher plano"}<ArrowRight className="h-3.5 w-3.5" /></>
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Payment Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl border border-border bg-card p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-bold">Pagamento e faturamento</h3>
        </div>

        {isActive && !isTrial ? (
          <div className="space-y-3">
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={handleManageSubscription}>
              <CreditCard className="h-3.5 w-3.5" />
              Gerenciar assinatura no Stripe
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              {isTrial ? "Nenhum método de pagamento configurado." : "Ative um plano para configurar o pagamento."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              O pagamento será configurado ao escolher um plano.
            </p>
          </div>
        )}
      </motion.div>

      {/* Footer */}
      <div className="text-center space-y-2 pt-2">
        <p className="text-xs text-muted-foreground">
          Sem taxa de adesão • Cancele quando quiser • Garantia de 30 dias
        </p>
        <div className="flex justify-center gap-4">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" /> Pagamento seguro
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3" /> Suporte dedicado
          </span>
        </div>
      </div>
    </div>
  );
}

export function SubscriptionCenter({ open, onOpenChange }: SubscriptionCenterProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerenciar Assinatura
            </DrawerTitle>
            <DrawerDescription>
              Controle seu plano, pagamentos e recursos do PsicoOne.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <SubscriptionCenterContent onClose={() => onOpenChange(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerenciar Assinatura
          </DialogTitle>
          <DialogDescription>
            Controle seu plano, pagamentos e recursos do PsicoOne.
          </DialogDescription>
        </DialogHeader>
        <SubscriptionCenterContent onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
