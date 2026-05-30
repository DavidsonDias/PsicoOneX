
# 🗺️ Roadmap PsicoOne Enterprise — 8 fases

Cada fase é independente, entregável e testável. Eu só inicio a próxima depois do seu OK.

---

## FASE 1 — Self-Onboarding do Paciente 🧑‍⚕️
**Entrega:** psicólogo cria cadastro mínimo (nome/email/telefone) → gera link seguro → paciente preenche tudo sozinho.

**Backend**
- Nova tabela `patient_onboarding_tokens` (token único, expiração configurável 24h/48h/72h/7d, status `pending|used|expired|revoked`, RLS).
- Colunas extras em `patients`: `rg`, `gender`, `marital_status`, `whatsapp`, `cep`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `profession`, `company`, `education`, `emergency_relationship`, `health_plan`, `health_plan_id`, `health_plan_expiry`, `onboarding_status` (`not_sent|pending|review|completed`), `onboarding_completed_at`, `lgpd_signature_data`, `lgpd_signed_at`.
- Bucket storage `patient-documents` (RG/CPF/CNH/convênio) com RLS por paciente.
- Edge function `patient-onboarding` (público via token): GET retorna paciente, POST salva dados + arquivos + assinatura.

**Frontend**
- Botão **"Enviar formulário para completar cadastro"** no `PatientForm` + `PatientDetailSheet`.
- Modal de geração de link (escolher validade + copiar/enviar por WhatsApp/email).
- Página pública `/onboarding/:token` — wizard de 6 passos (Pessoal → Contato → Endereço com auto-CEP → Profissional → Emergência → Convênio → Docs → Assinatura LGPD canvas).
- Badge "🟡 Aguardando revisão" no card do paciente + notificação para psicólogo + botão "Revisar informações".

---

## FASE 2 — Prontuário Enterprise 📄
- **Timeline clínica unificada** (consultas + evoluções + anexos + pagamentos em ordem cronológica) no `PatientProfile`.
- **Busca global** com debounce em todos os campos do prontuário (já existe `SmartSearch`, estendo).
- **Favoritos** — flag `is_favorite` em `medical_records`, estrela no `RecordCard`.
- **Central de anexos** — nova aba agrupando todos os arquivos do paciente com filtros (PDF/imagem/exame).
- **IA clínica** — botão "Resumo dos últimos 30 dias" usando `clinical-ai` edge function já existente.

---

## FASE 3 — Financeiro Enterprise + Stripe 💰
- Habilito Stripe (test mode) via `enable_stripe_payments`.
- Edge functions: `create-payment-link` (PIX/cartão para cobrança avulsa) e `create-recurring-charge`.
- Coluna `payment_link_url`, `stripe_invoice_id` em `financial_transactions`.
- UI: botão "Gerar link de cobrança" no `TransactionList`, semáforo de inadimplência (🟢🟡🔴).
- Dashboard financeiro: faturamento mensal, ticket médio, receita prevista vs recebida, % inadimplência.

---

## FASE 4 — Teleatendimento Enterprise 🎥
- **Sala permanente por paciente** (reusar `room_token` em todas as sessões do mesmo paciente).
- **Sala de espera** já existe — adiciono polling + som de notificação para psicólogo.
- **Lembrete 15min antes** via edge function agendada (`send-appointment-reminders` já existe — adiciono janela de 15min).
- **Anotações privadas em tempo real** durante a sessão (salva no `medical_records` rascunho).
- **Resumo pós-sessão** automático (já existe `summarize-session` — adiciono CTA ao final).

---

## FASE 5 — Portal do Paciente 3.0 📲
- Aba **Meu Financeiro** (lista de pagamentos, recibos PDF, links de cobrança pendentes).
- Aba **Documentos** (contratos assinados, recibos).
- Aba **Solicitações** (reagendamento/cancelamento usa `appointment_requests` já existente — UI nova).
- Edição de perfil (endereço, telefone, contato de emergência).

---

## FASE 6 — Central de Notificações Unificada 🔔
- Refator do `notifications` para suportar 5 categorias: lembrete, reagendamento, confirmação, pagamento, documento.
- Preferências por canal (email/WhatsApp/push) por categoria.
- Push web via Service Worker (PWA já existe).

---

## FASE 7 — Dashboard Executivo 📈
- Novos widgets na `CustomizableDashboard`: Hoje (sessões/cancelamentos/no-show), Financeiro (recebido/previsto/atrasado), Pacientes (ativos/novos/aniversariantes), Teleatendimento (online/tempo médio/presença), IA (resumos pendentes/insights).

---

## FASE 8 — Roadmap Avançado 🧠
A combinar conforme prioridade:
- Prescrição digital
- Recibos NFS-e (Focus NFe — integração já mapeada)
- Relatórios PDF profissionais
- App mobile (Capacitor)

---

## Como prosseguir

Me diga **qual fase iniciar agora**. Recomendo começar pela **Fase 1 (Self-Onboarding)** porque desbloqueia dados de qualidade para todas as outras fases. Quando você aprovar, eu executo a fase inteira (migração + edge functions + UI) e te mostro o resultado antes de avançar.
