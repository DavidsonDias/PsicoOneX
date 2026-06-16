## Auditoria Enterprise — Plano de Execução

Escopo grande. Vou dividir em 5 blocos entregáveis, do mais crítico ao mais estrutural. Cada bloco é independente e verificável.

---

### Bloco 1 — Timezone unificado (corrige "1 hora" quando faltam 2h)

**Diagnóstico provável:** lembretes usam `now() + 1h` em UTC comparado com `appointments.scheduled_at` que em alguns pontos é tratado como horário local (sem TZ). O envio dispara cedo e o template renderiza "em 1 hora" baseado em diferença errada.

**Ação:**
- Criar `src/lib/clinic-datetime.ts` com `formatClinicDate / formatClinicTime / parseClinicDate / diffHoursBR` — único ponto de verdade (America/Sao_Paulo). Reaproveita `src/lib/datetime.ts`.
- Auditar `send-appointment-reminders`, `send-appointment-email`, `whatsapp-notify-appointment`, `dispatch-notification`: tudo passa a calcular janela em UTC puro (`scheduled_at` é `timestamptz`) e renderizar BR só na saída.
- Templates de e-mail (`appointment-reminder.tsx`) recebem `hoursUntil` calculado no servidor (não recalculam).
- Front (Agenda, PatientAgendaTab, EmailPreview): substituir `new Date(str)` e `format(...)` diretos pelos helpers.

### Bloco 2 — AppointmentForm único

**Diagnóstico:** existem dois formulários — o completo da Agenda e o "mini" do perfil do paciente (screenshot 7). O mini tem horário/data divergentes (mostra `06/15/2026` formato US, sem recorrência, sem validação, sem update financeiro).

**Ação:**
- Promover o formulário da Agenda a `src/components/appointments/AppointmentForm.tsx` (componente reutilizável, props: `defaultPatientId`, `lockPatient`, `defaultDate`, `onCreated`).
- Substituir o mini-form de `PatientAgendaTab` por esse componente, com `lockPatient` e paciente pré-selecionado (sem dropdown).
- Mesma lógica: IA, recorrência, conflito, financeiro, resumo, notificações.

### Bloco 3 — Integração Financeiro ↔ Agenda

**Ação:**
- Trigger `appointments_financial_sync` (DB) — INSERT/UPDATE/DELETE em `appointments`:
  - INSERT → cria `financial_transactions` pendente (se `session_value > 0` e paciente tem `billing_mode='per_session'`).
  - UPDATE de `scheduled_at`/`session_value` → atualiza transação vinculada.
  - UPDATE para `status='cancelado'` → marca transação como cancelada.
  - DELETE → soft delete da transação.
- Coluna `financial_transactions.appointment_id` (se ainda não existe) para vinculação 1:1.
- Recorrência: ao criar série, gerar transações de uma vez via mesmo trigger.

### Bloco 4 — Push PWA Mobile + Diagnóstico

**Diagnóstico:** `usePushSubscription` bloqueia em iframe e em qualquer `*.lovableproject.com`. No PWA instalado isso funciona; problemas comuns mobile:
- VAPID `applicationServerKey` precisa ser `Uint8Array`, não `.buffer` (corrigir).
- Falta tela de diagnóstico para o usuário verificar.

**Ação:**
- Fix `applicationServerKey: urlBase64ToUint8Array(vapid)` (sem `.buffer`).
- Garantir SW registrado no domínio publicado (`scope: '/'`).
- Nova rota `/configuracoes/diagnostico-push` (`PushDiagnostics.tsx`): Permissão, Subscription, Endpoint (mascarado), SW status, VAPID configurado, último push (de `push_send_log`), último erro, botão "Enviar Notificação de Teste" → invoca `send-push` com `user_ids:[me]`.
- Tabela `push_send_log` (timestamp, user_id, endpoint, status, error) preenchida pelo `send-push`.

### Bloco 5 — Auditoria & Observabilidade

**Ação:**
- Tabela `audit_log` (actor_id, entity, entity_id, action, before, after, ip, ua, tz, created_at).
- Triggers genéricos em `appointments`, `financial_transactions`, `patients`, `medical_records`.
- Rota `/sistema/auditoria` (admin only): tabs Agenda / E-mails / Push / Financeiro / Pacientes / Erros, com filtros e exportação.

---

### Ordem de entrega

1. Bloco 1 (timezone) — ataca o bug reportado diretamente.
2. Bloco 2 (form único) — elimina divergência visível no perfil.
3. Bloco 4 (push + diagnóstico) — sua queixa do PWA mobile.
4. Bloco 3 (financeiro automático).
5. Bloco 5 (auditoria/observabilidade).

Cada bloco vira 1 turno com migração + código + verificação. Posso começar pelo **Bloco 1** já no próximo turno, ou você prefere outra ordem?
