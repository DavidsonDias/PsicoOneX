# Auditoria Enterprise PsicoOne — Plano de Execução

Escopo amplo. Vou entregar em **6 ondas** (waves), cada uma testável. Você pode aprovar tudo ou pedir para começar por uma onda específica.

---

## Wave 1 — Separação Agenda × Financeiro + Recorrência Indeterminada

**Problema:** hoje recorrência da agenda e do financeiro se misturam no mesmo formulário.

- **Agenda** (`AppointmentForm`) passa a controlar APENAS: data, hora, duração, tipo, frequência da sessão, recorrência (única, semanal, quinzenal, mensal, personalizada, **indeterminada**).
- Novo modo `indeterminada` → gera sessões em janela rolante de 90 dias via job diário (`extend-recurring-appointments` edge function + pg_cron).
- **Financeiro** (`TransactionForm`) ganha módulo próprio "Plano de Cobrança" por paciente: por sessão / semanal / quinzenal / mensal, com valor base e regra de geração independente.
- Tabela nova `patient_billing_plans` (patient_id, billing_type, amount, day_of_month, active, …).
- Edge function `generate-billing-cycle` roda diariamente e cria `financial_transactions` conforme o plano.

## Wave 2 — Motor de Validação Inteligente (IA)

- Novo hook `useConsistencyCheck` chamado antes de salvar paciente/agendamento/cobrança.
- Edge function `validate-consistency` (Lovable AI gemini-2.5-flash) recebe payload e retorna inconsistências + correção sugerida.
- Diálogo `ConsistencyDialog` mostra: "4 sessões/mês × R$100 = R$400. Valor informado R$200. Corrigir?".
- Casos cobertos: valor financeiro vs frequência da agenda, CPF/telefone/CEP inválidos, horário incomum (<7h ou >22h), conflito de agenda, duração incoerente.

## Wave 3 — Assistente IA Operacional

- **Cadastro de paciente:** badge "IA detectou X campos importantes faltando" + botão "Solicitar atualização" (dispara onboarding parcial via email).
- **Agendamento:** aviso inline de conflito / horário incomum / sobreposição via mesma função.
- **Financeiro:** card "Risco de inadimplência" no perfil do paciente (calcula atrasos últimos 60 dias, sugere lembrete automático). Reaproveita `proactive-insights`.

## Wave 4 — Responsividade Enterprise + Acessibilidade

- Auditoria de todas as telas listadas usando breakpoints 320 / 360 / 375 / 412 / 768 / 1024 / 1440.
- Substituir `text-*` fixos críticos por `clamp()` via classe utilitária `text-fluid-*` no `tailwind.config.ts`.
- Adicionar guard `overflow-x-hidden` em layouts raiz.
- Novo `AccessibilitySettings` em Configurações: Fonte normal / grande / extra grande (multiplica `--font-scale` no `:root`).
- Garantir tap-targets ≥44px nos botões `size="icon"` críticos.

## Wave 5 — Datas, Timezone e Logs Enterprise

- Helper único `src/lib/datetime.ts` forçando `America/Sao_Paulo` em todas formatações (date-fns-tz).
- Auditoria de todos `format()` e `new Date()` para uso do helper.
- Tabela `audit_logs` já existe — adicionar triggers em `patients`, `medical_records`, `appointments`, `financial_transactions` para registrar INSERT/UPDATE/DELETE com diff JSON.
- Nova aba "Histórico" no perfil do paciente exibindo Quem / Quando / O que alterou.

## Wave 6 — Dashboard Inteligente + Redução de Cliques

- Novos widgets no `CustomizableDashboard`: Próxima sessão, Receita prevista vs recebida, Inadimplência, Pacientes sem sessão há +30d.
- Insights IA reaproveitando `proactive-insights` com novos prompts.
- Atalhos de teclado globais (`n` paciente, `a` agendamento, `f` cobrança) já parcialmente em `CommandPalette` — expandir.
- Remover etapas duplicadas detectadas em PatientForm/AppointmentForm (campos repetidos entre wizards).

---

## Detalhes técnicos

- Migrations: `patient_billing_plans`, triggers de auditoria, índice em `appointments(scheduled_at, psychologist_id)` para validação rápida de conflito.
- Edge functions novas: `extend-recurring-appointments`, `generate-billing-cycle`, `validate-consistency`.
- pg_cron: agendar as duas primeiras (diário 03:00 BRT).
- Sem mudanças em telehealth/onboarding já entregues.
- Modelos IA: `google/gemini-2.5-flash` (validação) e `google/gemini-2.5-flash-lite` (insights leves).

---

## Como prefere prosseguir?

1. **"Executar tudo"** — entrego as 6 waves em sequência (várias mensagens, ~migrations grandes).
2. **"Começar pela Wave N"** — foco só nela primeiro.
3. **"Ajustar plano"** — me diga o que mudar antes de implementar.

Recomendo começar pelas Waves **1 + 2** porque resolvem os conflitos de regra de negócio que você apontou primeiro; o resto vira incremento.
