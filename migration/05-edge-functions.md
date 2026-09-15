# 05 — Edge Functions (42)

Todas usam `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` do runtime, que o Supabase externo injeta automaticamente → **nenhuma alteração de código** para o banco. O que muda são secrets próprios, providers externos e as dependências Lovable.

Legenda de origem: **FE** = invocada do frontend (`supabase.functions.invoke`), **CRON** = pg_cron, **WEBHOOK** = chamada externa, **DB** = chamada por função/trigger do banco via `pg_net`.

## IA (congeladas nesta fase — não alterar)
| Função | Finalidade | Origem | JWT | Secrets | Externo | Ação no destino |
|---|---|---|---|---|---|---|
| speech-to-text | transcrição clínica (chunks WAV) | FE | validado em código | LOVABLE_API_KEY | ai.gateway.lovable.dev | **CRÍTICO**: chave/gateway são da Lovable |
| clinical-ai | perfil clínico, busca semântica, resumo de período | FE | sim | LOVABLE_API_KEY | idem | idem |
| refine-record | refinamento de texto do prontuário | FE | sim | LOVABLE_API_KEY | idem | idem |
| summarize-session | resumo de sessão / teleatendimento | FE | sim | LOVABLE_API_KEY | idem | idem |
| generate-medical-record | geração de prontuário | FE | sim | LOVABLE_API_KEY | idem | idem |
| proactive-insights | insights determinísticos + IA sob demanda | FE | sim | LOVABLE_API_KEY | idem | idem |
| ai-insights | insights do dashboard | FE | sim | LOVABLE_API_KEY | idem | idem |
| transcribe-audio | transcrição alternativa | FE | sim | DEEPGRAM_API_KEY | Deepgram | COMPATÍVEL |
| validate-consistency | validação determinística (sem IA) | FE | sim | — | — | COMPATÍVEL |

> `LOVABLE_API_KEY` e `ai.gateway.lovable.dev` são o único ponto de IA amarrado à Lovable. Funciona a partir de qualquer runtime enquanto a chave for válida, mas é dependência externa a resolver numa etapa futura (fora do escopo desta fase).

## Assinatura / Stripe
| Função | Finalidade | Origem | JWT | Secrets | Ação |
|---|---|---|---|---|---|
| create-checkout | criar checkout de plano | FE | sim | STRIPE_SECRET_KEY | RECONFIGURAR (webhook/URLs) |
| customer-portal | portal do cliente Stripe | FE | sim | STRIPE_SECRET_KEY | RECONFIGURAR |
| check-subscription | sincronizar status do plano | FE | sim | STRIPE_SECRET_KEY | COMPATÍVEL |
| create-patient-payment-link | link de cobrança do paciente | FE | sim | STRIPE_SECRET_KEY | COMPATÍVEL |
| sync-patient-payments | conciliar pagamentos | FE | sim | STRIPE_SECRET_KEY | COMPATÍVEL |
| expire-trials | expirar trials | CRON | secret interno | CRON_SECRET | RECONFIGURAR (novo secret + job) |
| generate-billing-cycle | gerar cobranças recorrentes | CRON | secret interno | CRON_SECRET | RECONFIGURAR |

## E-mail (dependência Lovable)
| Função | Finalidade | Origem | Secrets | Ação |
|---|---|---|---|---|
| auth-email-hook | e-mails de signup/recovery/magic link | WEBHOOK (Auth hook) | assinatura Lovable | **BLOQUEADOR** — `@lovable.dev/email-js` + `@lovable.dev/webhooks-js` |
| process-email-queue | consome pgmq e envia | CRON dinâmico / DB | vault `email_queue_service_role_key` | **BLOQUEADOR** — `sendLovableEmail` |
| send-transactional-email | enfileira e-mail transacional | FE | — | RECONFIGURAR |
| preview-transactional-email | preview de template | FE | — | COMPATÍVEL |
| send-appointment-email | e-mail de agendamento/acesso | FE/DB | — | RECONFIGURAR |
| send-appointment-reminders | lembretes | CRON | CRON_SECRET | RECONFIGURAR |
| handle-email-unsubscribe | opt-out | WEBHOOK público | — | RECONFIGURAR (URL) |
| handle-email-suppression | bounces/suppression | WEBHOOK público | — | RECONFIGURAR (provedor) |

## Notificações
| Função | Finalidade | Origem | Secrets | Ação |
|---|---|---|---|---|
| dispatch-notification | grava notificação + dispara canais | DB (`pg_net`) | INTERNAL_FUNCTION_SECRET | **CRÍTICO** — URL hardcoded na função do banco |
| send-notification | envio pontual | FE | — | COMPATÍVEL |
| send-push | Web Push | FE/DB | VAPID_PRIVATE_KEY, VAPID_SUBJECT | RECONFIGURAR (secrets) |
| notification-full-test | teste dos 3 canais | FE | — | COMPATÍVEL |
| integration-test | diagnóstico de integrações | FE | — | COMPATÍVEL |

## WhatsApp
| Função | Origem | Secrets | Ação |
|---|---|---|---|
| whatsapp-send | FE | WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID | RECONFIGURAR |
| whatsapp-webhook | WEBHOOK Meta | WHATSAPP_VERIFY_TOKEN, META_APP_SECRET | RECONFIGURAR — **URL do webhook muda na Meta** |
| whatsapp-admin | FE | idem | RECONFIGURAR — painel tem URL hardcoded (`WhatsAppAdminPanel.tsx`) |
| whatsapp-notify-appointment | DB (`pg_net`) | idem | **CRÍTICO** — URL + anon key hardcoded na função do banco |
| send-whatsapp-reminders | CRON | CRON_SECRET | RECONFIGURAR |

## Google Calendar
| Função | Origem | Secrets | Ação |
|---|---|---|---|
| google-calendar-auth | FE | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | RECONFIGURAR — redirect URI muda |
| google-calendar-sync | FE | idem | COMPATÍVEL (tokens em `google_calendar_tokens` seguem válidos) |

## Portal do paciente / teleatendimento / agenda
| Função | Origem | JWT | Ação |
|---|---|---|---|
| patient-portal | WEBHOOK/token | token próprio | COMPATÍVEL |
| patient-onboarding | público (token) | token próprio | RECONFIGURAR (APP_BASE_URL/SITE_URL) |
| invite-patient | FE | sim | RECONFIGURAR (origin/redirect) |
| telehealth-room-info | público (token) | service role | COMPATÍVEL |
| telehealth-room-signal | FE/público | token | COMPATÍVEL |
| extend-recurring-appointments | CRON | CRON_SECRET | RECONFIGURAR |

## Ações comuns a todas
1. `supabase functions deploy` no projeto externo (o `config.toml` atual tem `project_id` divergente — corrigir).
2. Recriar todos os secrets (ver `06-secrets-env.md`).
3. CORS já usa `*` ou headers explícitos — nenhuma mudança necessária.
4. Atualizar `verify_jwt` conforme o `config.toml` atual (já mapeado no repositório).
5. Reapontar webhooks externos (Meta/WhatsApp, Stripe, unsubscribe/suppression) para o novo host.
