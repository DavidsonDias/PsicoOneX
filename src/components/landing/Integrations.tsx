import { motion } from "framer-motion";
import { Puzzle, Calendar, CreditCard, MessageCircle, FileText, Video, Mail, Smartphone } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";

const integrations = [
  { name: "Google Calendar", icon: Calendar, color: "bg-blue-500/10 text-blue-500" },
  { name: "WhatsApp", icon: MessageCircle, color: "bg-green-500/10 text-green-500" },
  { name: "Stripe", icon: CreditCard, color: "bg-purple-500/10 text-purple-500" },
  { name: "Google Meet", icon: Video, color: "bg-red-500/10 text-red-500" },
  { name: "Nota Fiscal", icon: FileText, color: "bg-yellow-500/10 text-yellow-500" },
  { name: "Email", icon: Mail, color: "bg-indigo-500/10 text-indigo-500" },
  { name: "SMS", icon: Smartphone, color: "bg-pink-500/10 text-pink-500" },
  { name: "PIX", icon: CreditCard, color: "bg-cyan-500/10 text-cyan-500" },
];

export function Integrations() {
  return (
    <section className="py-20 md:py-32 bg-background" id="integrations">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center mb-16 space-y-4"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Puzzle className="w-4 h-4" />
            Ecossistema Completo
          </span>
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-foreground">Integra com tudo </span>
            <span className="text-gradient-primary">que você usa</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Conecte suas ferramentas favoritas e automatize seu fluxo de trabalho
          </p>
        </motion.div>

        {/* Integration cards marquee */}
        <div className="relative">
          {/* Gradient masks */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
          
          <Marquee speed="slow" pauseOnHover>
            {integrations.map((integration, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05, y: -5 }}
                className="flex items-center gap-3 px-6 py-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-lg ${integration.color} flex items-center justify-center`}>
                  <integration.icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-foreground whitespace-nowrap">
                  {integration.name}
                </span>
              </motion.div>
            ))}
          </Marquee>
        </div>

        {/* Stats below */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-8 md:gap-16 mt-16 text-center"
        >
          <div>
            <p className="text-4xl font-bold text-gradient-primary">15+</p>
            <p className="text-sm text-muted-foreground">Integrações nativas</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-gradient-primary">API</p>
            <p className="text-sm text-muted-foreground">Aberta para devs</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-gradient-primary">99.9%</p>
            <p className="text-sm text-muted-foreground">Uptime garantido</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
