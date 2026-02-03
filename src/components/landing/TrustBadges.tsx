import { motion } from "framer-motion";
import { Shield, Lock, Award, CheckCircle2 } from "lucide-react";

const badges = [
  {
    icon: Shield,
    title: "LGPD",
    description: "100% Conforme",
  },
  {
    icon: Lock,
    title: "SSL/TLS",
    description: "Criptografia 256-bit",
  },
  {
    icon: Award,
    title: "ISO 27001",
    description: "Certificado",
  },
  {
    icon: CheckCircle2,
    title: "CFP",
    description: "Aprovado",
  },
];

export function TrustBadges() {
  return (
    <section className="py-12 bg-muted/30 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex items-center gap-3 text-muted-foreground"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <badge.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">{badge.title}</p>
                <p className="text-sm">{badge.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
