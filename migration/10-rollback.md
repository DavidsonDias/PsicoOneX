# 10 — Rollback

## Princípio
O Lovable Cloud permanece **intacto e funcionando** durante toda a migração. Nada é apagado lá. Enquanto o frontend de produção apontar para o Lovable Cloud, o rollback é apenas trocar variáveis de ambiente.

## Ponto de não retorno
| Etapa | Reversível? | Como voltar |
|---|---|---|
| Preparar Supabase externo (extensões, schema, buckets) | sim | não afeta produção |
| Importar auth + dados no destino | sim | destino é descartável até o cutover |
| Publicar Edge Functions no destino | sim | não afeta produção |
| Reapontar webhooks externos (Meta, Stripe) | sim | reapontar de volta ao host antigo |
| **Cutover: trocar `VITE_SUPABASE_URL`/`_PUBLISHABLE_KEY` no Vercel** | sim (janela curta) | reverter variáveis + redeploy → volta ao Lovable Cloud |
| Escrita real de usuários no destino após o cutover | **parcialmente** | dados novos existem só no destino; voltar exige re-exportar o delta |
| Remover o Lovable Cloud | **NÃO** | irreversível — última etapa, nunca agora |

## Como voltar (dentro de 24–48 h do cutover)
1. No Vercel, restaurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` antigos → redeploy.
2. Reapontar webhook do WhatsApp/Meta e endpoints Stripe para o host antigo.
3. Reativar cron jobs na origem (se pausados) e pausar no destino.
4. Exportar o delta criado no destino após o cutover (`created_at > <hora do cutover>` nas tabelas de escrita: appointments, patients, medical_records, financial_transactions, notifications, drafts, telehealth_sessions) e reinserir na origem, sem alterar UUIDs.
5. Reenviar reset de senha se algum usuário tiver redefinido no destino (a senha nova não volta).

## O que pode divergir
- Senhas redefinidas no destino após o cutover.
- Registros criados após o cutover (delta acima).
- Objetos de Storage enviados após o cutover.
- Logs (`audit_logs`, `email_send_log`, `whatsapp_logs`) — divergência aceitável.

## Como evitar escrita simultânea (obrigatório)
- Pausar **todos** os cron jobs da origem imediatamente antes do dump final.
- Não criar cron jobs no destino antes da validação.
- Cutover em janela de manutenção curta com o app fora do ar (ver `11-cutover-checklist.md`).
- Nunca operar os dois ambientes em produção ao mesmo tempo.
