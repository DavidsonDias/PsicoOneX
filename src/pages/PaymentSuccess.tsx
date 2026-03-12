import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, PartyPopper, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { PLAN_LABELS } from "@/lib/plans";
import { Helmet } from "react-helmet-async";

// Simple confetti effect
function Confetti() {
  const colors = [
    "hsl(217, 91%, 60%)", "hsl(270, 60%, 65%)", "hsl(142, 71%, 45%)",
    "hsl(45, 93%, 58%)", "hsl(340, 82%, 52%)", "hsl(200, 95%, 50%)",
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 3;
        const size = 6 + Math.random() * 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const rotate = Math.random() * 360;

        return (
          <motion.div
            key={i}
            className="absolute rounded-sm"
            style={{
              left: `${left}%`,
              top: -20,
              width: size,
              height: size * 0.6,
              backgroundColor: color,
              rotate: `${rotate}deg`,
            }}
            initial={{ y: -20, opacity: 1 }}
            animate={{
              y: window.innerHeight + 50,
              opacity: [1, 1, 0],
              rotate: rotate + 360 * (Math.random() > 0.5 ? 1 : -1),
              x: (Math.random() - 0.5) * 200,
            }}
            transition={{
              duration,
              delay,
              ease: "easeIn",
            }}
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

  useEffect(() => {
    refresh();
    const timer = setTimeout(() => setShowConfetti(false), 5000);
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
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <Card className="border-primary/20 shadow-2xl overflow-hidden">
            {/* Success header */}
            <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <PartyPopper className="h-5 w-5 text-amber-500" />
                  <h1 className="text-2xl font-bold">Pagamento confirmado!</h1>
                  <PartyPopper className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-muted-foreground">
                  Seu plano foi ativado com sucesso. Agora você pode aproveitar todos os recursos do PsicoOne.
                </p>
              </motion.div>
            </div>

            <CardContent className="p-6 space-y-6">
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
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Plano contratado</span>
                      <span className="font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        {planLabel}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-semibold text-emerald-500">Ativa</span>
                    </div>
                    {subscription.plan_started_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Data da assinatura</span>
                        <span className="font-medium">
                          {new Date(subscription.plan_started_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                    {subscription.plan_expires_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Próxima cobrança</span>
                        <span className="font-medium">
                          {new Date(subscription.plan_expires_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  className="w-full gap-2 h-12 text-base"
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                >
                  Acessar Dashboard <ArrowRight className="h-5 w-5" />
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
