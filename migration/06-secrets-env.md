# 06 — Matriz de variáveis e secrets (somente nomes)

## Frontend (build Vite / Vercel)
| NOME | LADO | ORIGEM | DESTINO | OBRIG. | SEGREDO | AÇÃO |
|---|---|---|---|---|---|---|
| VITE_SUPABASE_URL | frontend | `.env` gerado pela Lovable | env do Vercel | sim | não | SUBSTITUIR pelo host do Supabase externo |
| VITE_SUPABASE_PUBLISHABLE_KEY | frontend | idem | env do Vercel | sim | não (anon) | SUBSTITUIR |
| VITE_SUPABASE_PROJECT_ID | frontend | idem | env do Vercel | não | não | SUBSTITUIR |
| VITE_VAPID_PUBLIC_KEY | frontend | env/fallback em `src/lib/push-config.ts` | env do Vercel | sim (push) | não | MANTER (par com VAPID_PRIVATE_KEY) |
| SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY (sem VITE) | build | `.env` Lovable | — | não | não | REMOVER (legado) |

> `service_role` **nunca** entra em `.env`, variável `VITE_*`, código do frontend ou repositório.

## Backend (Edge Functions do projeto externo)
| NOME | LADO | ORIGEM | DESTINO | OBRIG. | SEGREDO | AÇÃO |
|---|---|---|---|---|---|---|
| SUPABASE_URL | backend | injetado | injetado | sim | não | AUTOMÁTICO |
| SUPABASE_ANON_KEY | backend | injetado | injetado | sim | não | AUTOMÁTICO |
| SUPABASE_SERVICE_ROLE_KEY | backend | injetado | injetado | sim | **sim** | AUTOMÁTICO |
| SUPABASE_JWKS | backend | Lovable | — | não | não | REAVALIAR (validação local de JWT) |
| SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS | backend | Lovable | — | não | sim | REMOVER (específico Lovable) |
| SUPABASE_DB_URL | backend | Lovable | novo | não | **sim** | RECRIAR |
| LOVABLE_API_KEY | backend | Lovable | novo | sim (IA) | **sim** | RECRIAR — única dependência de IA |
| STRIPE_SECRET_KEY | backend | Stripe | mesmo valor | sim | **sim** | RECRIAR |
| CRON_SECRET | backend | próprio | novo valor | sim | **sim** | GERAR NOVO |
| INTERNAL_FUNCTION_SECRET | backend | próprio | novo valor | sim | **sim** | GERAR NOVO |
| GOOGLE_CLIENT_ID | backend | Google Cloud | mesmo/novo | sim | não | RECONFIGURAR redirect URI |
| GOOGLE_CLIENT_SECRET | backend | Google Cloud | mesmo/novo | sim | **sim** | RECRIAR |
| WHATSAPP_ACCESS_TOKEN | backend | Meta | mesmo | sim | **sim** | RECRIAR |
| WHATSAPP_PHONE_NUMBER_ID | backend | Meta | mesmo | sim | não | RECRIAR |
| WHATSAPP_VERIFY_TOKEN | backend | próprio | novo | sim | **sim** | GERAR NOVO + atualizar na Meta |
| META_APP_SECRET | backend | Meta | mesmo | sim | **sim** | RECRIAR |
| VAPID_PRIVATE_KEY | backend | próprio | mesmo | sim | **sim** | RECRIAR (manter par com a pública) |
| VAPID_SUBJECT | backend | próprio | mesmo | sim | não | RECRIAR |
| DEEPGRAM_API_KEY | backend | Deepgram | mesmo | não | **sim** | RECRIAR se usar `transcribe-audio` |
| SITE_URL / APP_BASE_URL | backend | Lovable | domínio Vercel | sim | não | RECONFIGURAR |
| (provedor de e-mail próprio) | backend | novo | novo | sim | **sim** | CRIAR — substitui `@lovable.dev/email-js` |

## Vault (banco)
| NOME | AÇÃO |
|---|---|
| email_queue_service_role_key | RECRIAR com o service_role do destino (`vault.create_secret`) |

## Hardcoded a limpar na Fase 2
- Funções do banco com URL + anon key do projeto Lovable: `dispatch_notification_async`, `notify_whatsapp_appointment`, `email_queue_wake`, `email_queue_dispatch`.
- `src/components/admin/WhatsAppAdminPanel.tsx` (URL do projeto).
- `supabase/config.toml` → `project_id` divergente (`pnkhogpsadywdbgzqhfi`).
- `src/integrations/supabase/client.ts` e `.env` (gerados pela Lovable) passam a ser mantidos manualmente.
