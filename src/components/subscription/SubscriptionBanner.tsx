import { useSubscription } from "@/hooks/useSubscription";
import { Clock, Ban, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionCenter } from "@/contexts/SubscriptionCenterContext";
import { cn } from "@/lib/utils";

export function SubscriptionBanner() {
  const { subscription, loading, isTrial, isExpired, isBlocked, isTrialExpiring, trialDaysRemaining } = useSubscription();
  const { setOpen } = useSubscriptionCenter();

  if (loading || !subscription) return null;
  if (subscription.status === 'active' && subscription.plan !== 'trial') return null;
  if (isTrial && !isTrialExpiring) return null;

  const bannerConfig = (() => {
    if (isExpired) return {
      icon: Ban,
      bg: "bg-destructive/10 border-destructive/30",
      text: "text-destructive",
      title: "Seu período de teste expirou",
      description: "Seus dados estão seguros. Contrate um plano para continuar criando e editando.",
    };
    if (isBlocked) return {
      icon: Ban,
      bg: "bg-destructive/10 border-destructive/30",
      text: "text-destructive",
      title: subscription.blocked_reason || "Conta bloqueada",
      description: "Entre em contato com o suporte para mais informações.",
    };
    if (isTrialExpiring) return {
      icon: Clock,
      bg: "bg-amber-500/10 border-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
      title: `Seu trial expira em ${trialDaysRemaining} dia${trialDaysRemaining !== 1 ? 's' : ''} útei${trialDaysRemaining !== 1 ? 's' : ''}`,
      description: "Garanta acesso contínuo ativando seu plano agora.",
    };
    return null;
  })();

  if (!bannerConfig) return null;
  const Icon = bannerConfig.icon;

  return (
    <div className={cn("border rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap", bannerConfig.bg)}>
      <Icon className={cn("h-5 w-5 shrink-0", bannerConfig.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold", bannerConfig.text)}>{bannerConfig.title}</p>
        <p className="text-xs text-muted-foreground">{bannerConfig.description}</p>
      </div>
      <Button size="sm" variant="default" className="gap-1.5 shrink-0" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" />
        Ver Planos
      </Button>
    </div>
  );
}
