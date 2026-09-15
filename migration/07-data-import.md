# 07 — Importação de dados

## Fonte primária
**`pg_dump` oficial do Lovable Cloud.** Nenhum dado é recriado, inferido ou gerado por INSERT manual. As migrations do repositório servem para auditoria da estrutura e, se necessário, reconstrução do schema.

## Dumps a produzir (na janela de corte)
```bash
# 1) Estrutura de public
pg_dump "$SRC" --schema-only --schema=public --no-owner --no-privileges -f 02a-public-schema.sql

# 2) Dados de public (sem estrutura)
pg_dump "$SRC" --data-only --schema=public --no-owner --disable-triggers -f 07a-public-data.sql

# 3) Identidade (somente as tabelas necessárias, preservando UUID)
pg_dump "$SRC" --data-only --no-owner \
  -t auth.users -t auth.identities -f 07b-auth-data.sql

# 4) Storage: metadados só para referência; objetos são copiados por API
pg_dump "$SRC" --data-only --no-owner -t storage.buckets -f 07c-buckets.sql
```
Não dumpar `auth.sessions`, `auth.refresh_tokens`, `auth.audit_log_entries`, `storage.objects`, `cron.*`, `net.*`, `pgmq.*`.

## Ordem de restauração no destino
1. Extensões (`02-schema.sql`, bloco A).
2. Estrutura de `public` (`02a-public-schema.sql`).
3. Grants + `EXECUTE` (`02-schema.sql`, bloco F).
4. Filas pgmq (bloco B).
5. **`auth.users` → `auth.identities`** (07b) — triggers de `auth.users` ainda **não** criados.
6. Dados de `public` (07a) com `--disable-triggers` / `session_replication_role = replica` para não disparar auditoria, notificações (`pg_net`) e sincronização financeira durante o import.
7. Reativar triggers e criar os 2 triggers de `auth.users` (bloco C).
8. Buckets + policies de storage (bloco G) e cópia dos 29 objetos (`04-storage-plan.md`).
9. Funções com URL hardcoded, recriadas com o host do destino (bloco D) + segredo do Vault (bloco E).
10. Deploy das Edge Functions + secrets.
11. Cron jobs (bloco H) — **por último**, para não disparar lembretes/cobranças durante a carga.
12. `08-validation.sql` no destino e comparação com o preflight.

## Cuidados obrigatórios
- Import com triggers ativos criaria: linhas duplicadas em `audit_logs`, notificações falsas, transações financeiras duplicadas por `sync_appointment_financial`, sessões de teleatendimento extras e chamadas HTTP via `pg_net`. **Sempre desativar triggers na carga.**
- `email_send_state` tem 1 linha fixa (id=1) — verificar conflito de PK.
- `system_metadata` (assinatura SevenDevX) deve vir do dump, não ser recriada.
- Após a carga, nada de `gen_random_uuid()` sobre dados existentes.
- Volume total é pequeno (7.750 linhas + 91 MB de arquivos): a carga inteira roda em minutos, o que permite janela de manutenção curta.
