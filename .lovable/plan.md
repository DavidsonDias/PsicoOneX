# Wave 3 — Segurança Clínica + Notificações Reais + Login Enterprise

Escopo grande. Divido em **5 blocos independentes**, cada um testável isoladamente. Posso entregar tudo em sequência ou só os blocos que você priorizar.

---

## Bloco A — Prontuário à prova de falhas 🛡️
*Maior prioridade clínica (você já perdeu prontuário antes).*

- **AutoSave a cada 10s** no `ProntuarioEditor` reaproveitando `useAutosave` que já existe (hoje está a 3s mas sem indicador visível em todos os fluxos).
- **Draft local em IndexedDB** (não só localStorage) via `offline-store.ts` — sobrevive a crash de aba, queda de internet e logout acidental.
- **Banner "Rascunho recuperado"** ao reabrir prontuário com diff visual (texto atual × rascunho) e botões *Restaurar* / *Descartar*.
- **Histórico de versões**: nova tabela `medical_record_versions` (snapshot a cada save bem-sucedido, máx 50 por prontuário) + aba "Versões" com timeline e botão *Restaurar esta versão*.
- **Trigger de auditoria** em `medical_records` (INSERT/UPDATE/DELETE → `audit_logs` com diff jsonb) — já planejado na Wave 5 do plano original, antecipo aqui.

## Bloco B — Notificações ponta a ponta 🔔
*Conectar a infra de push já pronta aos eventos reais.*

- **Edge function `dispatch-notification`** (helper único) que recebe `{user_ids, category, title, body, url}` e: (1) insere em `notifications`, (2) chama `send-push`, (3) opcionalmente enfileira email/WhatsApp conforme `user_preferences`.
- **Triggers automáticos** (DB triggers + chamadas em hooks):
  - Paciente conclui onboarding → psicólogo recebe push + email + sino.
  - Paciente atualiza cadastro (endereço/telefone/CPF) → diff resumido na notificação.
  - Agenda: nova sessão, reagendada, cancelada, paciente entrou na sala de espera.
  - Financeiro: pagamento recebido, vencido, PIX gerado, inadimplência detectada.
  - Prontuário: save falhou, rascunho recuperado.
- **Central unificada `/notificacoes`** (refazer a página atual):
  - Tabs: Todas / Agenda / Financeiro / Pacientes / Sistema (contador de não-lidas por tab).
  - Busca por texto, filtro por período, marcar lida, arquivar, marcar todas como lidas.
  - Realtime via canal Supabase já em uso no `useNotifications`.
- **Preferências por categoria** em Configurações: liga/desliga push/email/WhatsApp por tipo de evento (grava em `user_preferences`).

## Bloco C — Ciclo de vida do paciente 🔄
*Componente `PatientLifecycleManager` já existe parcialmente — completar.*

- Migration: nova coluna `lifecycle_status` em `patients` (enum `ativo|pausado|alta|encaminhado|abandono|encerrado|arquivado`) + `lifecycle_reason text` + `lifecycle_changed_at`.
- Tabela `patient_status_history` (já existe) recebe trigger automático em cada UPDATE de `lifecycle_status` com `from_status`, `to_status`, `reason`, `changed_by`.
- Badge colorido do status no `PatientCard`, `PatientProfile` e listagem.
- Filtro por status na lista de pacientes (`Patients.tsx`).
- Regra: paciente em `alta|abandono|encerrado|arquivado` não aparece em agenda nova nem em sugestões de cobrança recorrente.
- Timeline unificada já existe (`PatientUnifiedTimeline`) — adiciono entradas de mudança de status.

## Bloco D — Login Enterprise 🔐
*Multi-identificador + persistência real.*

- **Remember Me persistente**: `supabase.auth` já usa localStorage; vou ajustar refresh agressivo + checkbox "Manter conectado por 30 dias" (controla `expiresIn` no signIn).
- **Login por email OU username**: campo único "Email ou usuário". Se não tiver `@`, faço lookup em `profiles.username` (índice unique já existe) → recupero email → chamo `signInWithPassword`.
- **Magic Link** como botão alternativo em `/auth` (já suportado pelo Supabase, falta UI).
- **Login por telefone**: pulando SMS conforme você pediu — apenas deixo o campo username pronto e o magic link cobre o caso de "não lembro senha".
- Tela `/auth` redesenhada: 3 tabs (Entrar / Cadastrar / Magic Link), validação inline, lembrar último identificador usado.

## Bloco E — Dashboard clínico 📊
*Widgets reais conectados aos dados, não placeholders.*

Novos cards no `CustomizableDashboard` (já é drag-drop):
- **Pacientes ativos** (count `lifecycle_status = 'ativo'`).
- **Risco de abandono** (sem sessão há +30 dias, status ainda `ativo`) — clicável, abre lista filtrada.
- **Receita prevista vs recebida** (mês corrente, gráfico barra dupla).
- **Próximos pagamentos** (próximos 7 dias, ordenado por vencimento).
- **Sessões da semana** (calendário compacto, hoje destacado).
- **Pendências clínicas** (prontuários não finalizados >48h após sessão).
- **Alertas IA** (reaproveita `proactive-insights`, já existe).

---

## Detalhes técnicos

- **Migrations novas**:
  - `medical_record_versions` (record_id, version_number, content jsonb, created_by, created_at) + RLS por psicólogo dono.
  - `patients.lifecycle_status` + trigger de histórico.
  - Triggers de auditoria em `medical_records` e `patients`.
  - Índice em `medical_records(patient_id, updated_at desc)` para a aba versões.
- **Edge functions novas**:
  - `dispatch-notification` (orquestrador único).
  - Hooks em `appointments`, `financial_transactions`, `medical_records` chamam via `pg_net` ou direto no client.
- **Componentes novos**:
  - `medical-records/VersionHistory.tsx`, `medical-records/DraftRecoveryBanner.tsx`
  - `notifications/NotificationFilters.tsx`, `notifications/NotificationPreferences.tsx`
  - `auth/MagicLinkForm.tsx`, refactor de `pages/Auth.tsx`
  - `dashboard/widgets/AbandonmentRisk.tsx`, `RevenueForecast.tsx`, `UpcomingPayments.tsx`, `PendingRecords.tsx`
- **Sem mexer em**: telehealth, onboarding já entregue, Stripe, plugins.

---

## Ordem sugerida de entrega

Recomendo: **A → B → C → D → E**.
- **A** resolve risco clínico real (perda de prontuário).
- **B** torna a infra de push que já está paga efetivamente útil.
- **C** desbloqueia métricas reais para **E**.
- **D** é independente, posso fazer em paralelo.

## Como prosseguir?

1. **"Executar tudo A→E"** — entrego em 4-5 mensagens sequenciais.
2. **"Só Bloco X"** — foco e concluo um bloco antes do próximo.
3. **"Trocar ordem / remover bloco"** — ajusto o plano antes.
