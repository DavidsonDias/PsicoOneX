import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingElement } from "@/components/ui/floating-element";

export function CTASection() {
  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      
      {/* Floating orbs */}
      <FloatingElement className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" delay={0}>
        <div />
      </FloatingElement>
      <FloatingElement className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" delay={1}>
        <div />
      </FloatingElement>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-medium shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            Oferta por tempo limitado
          </motion.div>

          {/* Heading */}
          <h2 className="text-4xl md:text-6xl font-bold leading-tight">
            <span className="text-foreground">Comece sua jornada </span>
            <br />
            <span className="text-gradient-primary">enterprise hoje</span>
          </h2>

          {/* Description */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Junte-se a mais de 2.000 profissionais que já transformaram sua prática 
            clínica com o PsicoOne. Sem cartão de crédito para começar.
          </p>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span>15 dias grátis</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Sem compromisso</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Cancele quando quiser</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              variant="hero"
              size="lg"
              className="group text-lg px-10 py-6 shadow-xl hover:shadow-2xl transition-all"
              onClick={() => window.location.href = '/auth'}
            >
              Começar Teste Gratuito
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-10 py-6">
              Agendar Demonstração
            </Button>
          </div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="pt-8"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="flex -space-x-3">
                {["MS", "CM", "AC", "RA", "FL"].map((initials, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold border-2 border-background"
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">
                  +2.000 profissionais
                </p>
                <p className="text-xs text-muted-foreground">
                  já estão usando o PsicoOne
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
