# 03 — Plano de Auth (preservação de identidade)

## Estado atual
- 14 usuários em `auth.users`; 15 identities (8 Google, 7 email).
- 14 `profiles` (PK = `auth.users.id`), 15 `user_roles`, 14 `subscriptions`.
- Triggers em `auth.users`: `on_auth_user_created` → `handle_new_user()`; `on_auth_user_created_assign_role` → `assign_default_role()`.
- Login aceita e-mail **ou** username → RPC `get_email_by_username` (precisa de `EXECUTE` para `anon`).
- Google: hoje passa pelo broker `@lovable.dev/cloud-auth-js` (`src/integrations/lovable/index.ts`, usado por `GoogleAuthButton`).
- E-mails de auth: hook `auth-email-hook` com `@lovable.dev/email-js` + `@lovable.dev/webhooks-js`.

## Regra de ouro
**Os `auth.users.id` devem ser importados com o mesmo UUID.** Todo o banco depende disso (FKs em `profiles`, `user_roles`, `patients.user_id`, `drafts`, `user_preferences` + colunas `psychologist_id`, `user_id`, `created_by`, `deleted_by`… sem FK). Se um UUID mudar, os dados do psicólogo somem para ele mesmo, e o RLS baseado em `auth.uid()` bloqueia tudo.

## Estratégia (ordem obrigatória)
1. **Importar `auth.users` primeiro, com triggers DESLIGADOS.** Os triggers criam `profiles`/`subscriptions` automaticamente; se estiverem ativos durante o import, geram registros duplicados/conflitantes com os que virão do dump de `public`.
2. Importar `auth.identities` preservando `user_id`, `provider`, `provider_id` (necessário para o Google reconhecer a conta existente em vez de criar outra).
3. Importar `public` (dump de dados).
4. Só então recriar os 2 triggers de `auth.users` (bloco C do `02-schema.sql`).
5. **Não** importar `auth.sessions` / `auth.refresh_tokens`: todos os usuários serão deslogados no cutover (comportamento esperado e desejável).

## Senhas
Premissa aceita: **senhas não serão migradas**. Consequência no primeiro login após o cutover:

| Tipo de usuário | O que acontece | Ação |
|---|---|---|
| Google (8 identities) | Login funciona normalmente, desde que `auth.identities` tenha sido importado com o mesmo `provider_id` **e** o novo Google OAuth client esteja configurado | nenhuma |
| E-mail/senha (7) | Senha inválida no primeiro acesso | disparar "Esqueci minha senha" para cada um, ou enviar recovery em lote no cutover |
| Sessão ativa em PWA | Sessão inválida → tela de login | reautenticar |

Fluxo de recuperação: `resetPasswordForEmail(email, { redirectTo: <origin>/reset-password })` já implementado em `Auth.tsx`. Requer e-mail funcionando no destino **antes** do cutover (ver `04`/`06` e o bloqueador de e-mail).

Alternativa se o dump oficial incluir `encrypted_password` (bcrypt, formato padrão GoTrue): importar a coluna preserva as senhas e elimina o reset em lote. Verificar no dump antes de assumir que não vem.

## Configuração no destino (manual, painel do Supabase externo)
- Habilitar provider **Email** (confirmação de e-mail ligada, sem auto-confirm).
- Habilitar provider **Google** com Client ID/Secret **próprios** (Google Cloud Console) — o broker Lovable deixa de existir.
  - Authorized redirect URI: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
  - Authorized JavaScript origins: domínio Vercel de produção + domínios de teste.
- **Site URL** e **Redirect URLs**: incluir `https://psicoone.vercel.app`, domínio custom (`psicoone.com.br` se aplicável), `http://localhost:8080`, e as rotas usadas no código: `/`, `/dashboard`, `/reset-password`, `/portal/*`, `/sala/*`, `/onboarding/*`.
- Desativar sign-up anônimo.
- Ativar proteção contra senha vazada (leaked password protection) — hoje pendente na origem.

## Código a ajustar (Fase 2, não agora)
- `src/integrations/lovable/index.ts` + `GoogleAuthButton` → trocar broker Lovable por `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`.
- Remover dependência `@lovable.dev/cloud-auth-js` do `package.json`.
- `src/integrations/supabase/client.ts` e `.env` são gerados pela Lovable → no destino passam a ser arquivos próprios com as variáveis do Supabase externo.
- `auth-email-hook` → reescrever para provedor próprio (SMTP/Resend) ou desativar o hook e usar templates nativos do Supabase.

## Classificação
| Item | Classe |
|---|---|
| UUIDs de `auth.users` preservados | CRÍTICO |
| `auth.identities` (Google) preservado | CRÍTICO |
| Triggers de `auth.users` recriados manualmente | CRÍTICO |
| `EXECUTE` em `has_role`/`get_email_by_username` | CRÍTICO |
| Senhas | MIGRAR MANUALMENTE (reset em lote) |
| Google OAuth próprio | RECONFIGURAR |
| Broker `@lovable.dev/cloud-auth-js` | BLOQUEADOR (precisa ser substituído antes do cutover) |
| E-mail de auth (`@lovable.dev/email-js`) | BLOQUEADOR |
| Sessões ativas | descartáveis |
