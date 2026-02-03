import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Quanto tempo leva para começar a usar?",
    answer:
      "Você pode começar a usar imediatamente após criar sua conta. Oferecemos um onboarding guiado que leva cerca de 10 minutos para configurar seu perfil, agenda e preferências. Se preferir, nossa equipe pode fazer a migração dos seus dados de outros sistemas.",
  },
  {
    question: "O PsicoOne é conforme à LGPD?",
    answer:
      "Sim, 100%! Implementamos criptografia de ponta a ponta, servidores no Brasil, controle de acesso granular, logs de auditoria e todas as políticas exigidas pela LGPD, CFP e demais órgãos reguladores. Seus dados e de seus pacientes estão completamente seguros.",
  },
  {
    question: "Posso migrar meus dados de outro sistema?",
    answer:
      "Sim! Nossa equipe de suporte realiza a migração completa de seus dados de qualquer sistema anterior. Prontuários, cadastros de pacientes, histórico financeiro - tudo é transferido de forma segura e sem custos adicionais no plano Profissional.",
  },
  {
    question: "Como funciona o teleatendimento?",
    answer:
      "Nossa sala virtual é integrada diretamente ao sistema, sem necessidade de instalar aplicativos. Inclui compartilhamento de tela, recursos terapêuticos em tempo real, gravação de sessões (com consentimento) e transcrição automática com IA.",
  },
  {
    question: "Posso usar em mais de um dispositivo?",
    answer:
      "Sim! O PsicoOne funciona em qualquer dispositivo com navegador web. Seus dados sincronizam automaticamente entre computador, tablet e celular. Também temos um app mobile nativo para você e seus pacientes.",
  },
  {
    question: "E se eu precisar cancelar?",
    answer:
      "Você pode cancelar a qualquer momento, sem multas ou burocracias. Seus dados ficam disponíveis para exportação por 90 dias após o cancelamento. Não há fidelidade mínima em nenhum plano.",
  },
  {
    question: "O suporte é realmente via WhatsApp?",
    answer:
      "Sim! Nosso time de suporte atende via WhatsApp de segunda a sexta, das 8h às 20h. Para emergências técnicas, temos plantão 24/7. Tempo médio de resposta: menos de 5 minutos em horário comercial.",
  },
  {
    question: "Quais formas de pagamento são aceitas?",
    answer:
      "Aceitamos cartão de crédito (todas as bandeiras), PIX, boleto bancário e débito em conta. Para clínicas, oferecemos também faturamento mensal com nota fiscal.",
  },
];

export function FAQ() {
  return (
    <section className="py-20 md:py-32 bg-muted/30" id="faq">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center mb-16 space-y-4"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <HelpCircle className="w-4 h-4" />
            Perguntas Frequentes
          </span>
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-foreground">Tire suas </span>
            <span className="text-gradient-primary">dúvidas</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Tudo o que você precisa saber antes de começar
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/50 transition-colors"
              >
                <AccordionTrigger className="text-left font-semibold hover:text-primary transition-colors py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
