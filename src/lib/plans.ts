import { Zap, Crown, Building2 } from "lucide-react";

export interface PlanConfig {
  id: "basic" | "pro" | "enterprise";
  name: string;
  icon: typeof Zap;
  price: string;
  priceValue: number;
  period: string;
  description: string;
  popular?: boolean;
  gradient: string;
  borderColor: string;
  iconColor: string;
  features: string[];
  patientLimit: number | null; // null = unlimited
  stripePriceId: string;
  stripeProductId: string;
}

export const PLANS: PlanConfig[] = [
  {
    id: "basic",
    name: "Starter",
    icon: Zap,
    price: "R$ 39",
    priceValue: 39,
    period: "/mês",
    description: "Ideal para psicólogos iniciantes",
    gradient: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
    iconColor: "text-emerald-500",
    patientLimit: 30,
    stripePriceId: "price_1T9mRHAoMppjN4nr2UaJUpFD",
    stripeProductId: "prod_U82Wyp2NAEaoXN",
    features: [
      "Até 30 pacientes",
      "Agenda inteligente",
      "Prontuários digitais",
      "Relatórios básicos",
      "Suporte por email",
    ],
  },
  {
    id: "pro",
    name: "Profissional",
    icon: Crown,
    price: "R$ 79",
    priceValue: 79,
    period: "/mês",
    description: "Para profissionais com maior volume",
    popular: true,
    gradient: "from-primary/20 to-secondary/20",
    borderColor: "border-primary/50",
    iconColor: "text-primary",
    patientLimit: null,
    stripePriceId: "price_1T9mRmAoMppjN4nrQUuyWzu9",
    stripeProductId: "prod_U82Wv9An1Jcqos",
    features: [
      "Pacientes ilimitados",
      "Prontuários avançados com IA",
      "Relatórios financeiros",
      "Integração Google Agenda",
      "Exportação de dados",
      "Teleatendimento HD",
      "Portal do paciente",
      "Suporte prioritário",
    ],
  },
  {
    id: "enterprise",
    name: "Clínica",
    icon: Building2,
    price: "R$ 149",
    priceValue: 149,
    period: "/mês",
    description: "Para clínicas e equipes",
    gradient: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30",
    iconColor: "text-purple-500",
    patientLimit: null,
    stripePriceId: "price_1T9mSFAoMppjN4nrbsE6vHIW",
    stripeProductId: "prod_U82X4WNolo5r3l",
    features: [
      "Tudo do Profissional",
      "Múltiplos profissionais",
      "Gestão de equipe",
      "Agenda compartilhada",
      "Relatórios avançados",
      "Controle de repasses",
      "Onboarding dedicado",
      "Gerente de sucesso",
    ],
  },
];

export const getPlanById = (id: string) => PLANS.find((p) => p.id === id);
export const getPlanByStripeProductId = (productId: string) =>
  PLANS.find((p) => p.stripeProductId === productId);
export const getPlanByStripePriceId = (priceId: string) =>
  PLANS.find((p) => p.stripePriceId === priceId);

export const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  basic: "Starter",
  pro: "Profissional",
  enterprise: "Clínica",
};
