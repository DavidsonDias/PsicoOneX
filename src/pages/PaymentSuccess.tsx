import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, PartyPopper, Sparkles, Shield, Calendar } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { PLAN_LABELS, getPlanById } from "@/lib/plans";
import { Helmet } from "react-helmet-async";

function Confetti() {
  const colors = [
    "hsl(217, 91%, 60%)", "hsl(270, 60%, 65%)", "hsl(142, 71%, 45%)",
    "hsl(45, 93%, 58%)", "hsl(340, 82%, 52%)", "hsl(200, 95%, 50%)",
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 60 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2.5 + Math.random() * 3;
        const size = 6 + Math.random() * 10;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const rotate = Math.random() * 360;
        const isCircle = Math.random() > 0.5;

        return (
          <motion.div
            key={i}
            className={isCircle ? "absolute rounded-full" : "absolute rounded-sm"}
            style={{
              left: `${left}%`,
              top: -20,
              width: size,
              height: isCircle ? size : size * 0.6,
              backgroundColor: color,
              rotate: `${rotate}deg`,
            }}
            initial={{ y: -20, opacity: 1 }}
            animate={{
              y: typeof window !== 'undefined' ? window.innerHeight + 50 : 1000,
              opacity: [1, 1, 0],
              rotate: rotate + 360 * (Math.random() > 0.5 ? 1 : -1),
              x: (Math.random() - 0.5) * 300,
            }}
            transition={{ duration, delay, ease: "easeIn" }}
          />
        );
      })}
    </div>
  );
}

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { subscription, loading, refresh, planLabel } = useSubscription();
  const [showConfetti, setShowConfetti] = useState(true);

  const planConfig = subscription ? getPlanById(subscription.plan) : null;

  useEffect(() => {
    refresh();
    const timer = setTimeout(() => setShowConfetti(false), 6000);
    return () => clearTimeout(timer);
  }, [refresh]);

  return (
    <>
      <Helmet>
        <title>Pagamento Confirmado | PsicoOne</title>
      </Helmet>

      {showConfetti && <Confetti />}

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
          className="w-full max-w-lg"
        >
          <Card className="border-primary/20 shadow-2xl overflow-hidden">
            {/* Success header */}
            <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-8 sm:p-10 text-center relative">
              {/* Decorative rings */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5">
                <div className="w-64 h-64 rounded-full border-2 border-primary" />
                <div className="w-48 h-48 rounded-full border-2 border-primary absolute" />
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5 relative"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <PartyPopper className="h-5 w-5 text-amber-500" />
                  <h1 className="text-2xl sm:text-3xl font-bold">Pagamento confirmado!</h1>
                  <PartyPopper className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-muted-foreground text-sm sm:text-base max-w-sm mx-auto">
                  Seu plano foi ativado com sucesso. Agora você pode aproveitar todos os recursos do PsicoOne.
                </p>
              </motion.div>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Subscription details */}
              {!loading && subscription && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3"
                >
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Detalhes da assinatura
                  </h3>
                  <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Plano contratado</span>
                      <span className="font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        {planLabel}
                      </span>
                    </div>
                    {planConfig && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Valor</span>
                        <span className="font-semibold text-primary">
                          {planConfig.price}<span className="text-xs font-normal text-muted-foreground">{planConfig.period}</span>
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className="font-semibold text-emerald-500 flex items-center gap-1">
                        <Shield className="h-3.5 w-3.5" /> Ativa
                      </span>
                    </div>
                    {subscription.plan_started_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Data da assinatura</span>
                        <span className="font-medium flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {new Date(subscription.plan_started_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                    {subscription.plan_expires_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Próxima cobrança</span>
                        <span className="font-medium">
                          {new Date(subscription.plan_expires_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Feature highlights */}
                  {planConfig && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="rounded-xl border bg-primary/5 p-4"
                    >
                      <p className="text-xs font-semibold text-primary mb-2">Recursos inclusos</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {planConfig.features.slice(0, 6).map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span className="truncate">{f}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="space-y-3"
              >
                <Button
                  className="w-full gap-2 h-12 text-base"
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                >
                  Acessar Dashboard <ArrowRight className="h-5 w-5" />
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Você pode gerenciar sua assinatura a qualquer momento nas configurações.
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
