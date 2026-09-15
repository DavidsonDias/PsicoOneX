# 11 — Plano de execução e checklist de cutover

Fluxo por etapa: **PREPARAR → EXECUTAR → VALIDAR → AUTORIZAR PRÓXIMA**. Nada roda sem sua autorização explícita.

| # | ETAPA | AÇÃO | PRÉ-REQUISITO | RISCO | ROLLBACK | VALIDAÇÃO | CRITÉRIO DE ACEITE |
|---|---|---|---|---|---|---|---|
| 1 | Preflight | rodar `01-preflight.sql` na origem e arquivar a saída | nenhum | nenhum | n/a | saída salva | fingerprints e counts registrados |
| 2 | Resolver bloqueadores | provedor de e-mail próprio + Google OAuth próprio + código de login sem broker Lovable (em branch, sem deploy) | decisão do provedor de e-mail | médio | descartar branch | build + teste local | login Google e e-mail funcionando em ambiente de teste |
| 3 | Preparar destino | extensões, schema de `public`, grants/EXECUTE, filas pgmq | projeto externo criado | baixo | recriar projeto | `08-validation.sql` itens 4 | `schema_fingerprint` igual ao da origem |
| 4 | Auth | importar `auth.users` + `auth.identities` com triggers desligados | etapa 3 | **crítico** (UUID) | truncar e reimportar no destino | fingerprint de users | 14 usuários, 15 identities, UUIDs idênticos |
| 5 | Dados (ensaio) | importar dump de dados com triggers desligados | etapa 4 | médio | reimportar | `08-validation.sql` 1–3 | counts e órfãos conforme esperado |
| 6 | Triggers + funções | criar triggers de `auth.users`, recriar as 4 funções com URL do destino, Vault | etapa 5 | médio | recriar funções | item 5 da validação | 2 triggers + segredo presentes |
| 7 | Storage | criar buckets, policies e copiar os 29 objetos | etapa 3 | baixo | recopiar | itens 6 e 7 da validação | todo anexo referenciado existe |
| 8 | Edge Functions + secrets | deploy das 42 funções, cadastrar secrets, corrigir `project_id` | etapas 3–6 | médio | redeploy | invocar as principais | funções respondem 200 |
| 9 | Providers e e-mail | Google, Site URL, redirects, e-mail transacional/auth | etapa 2 | alto | reconfigurar | envio de teste | e-mail e OAuth funcionando |
| 10 | Ensaio completo | rodar `09-test-plan.md` inteiro no destino ainda em paralelo | 3–9 | baixo | corrigir e repetir | checklist | 100% aprovado |
| 11 | **JANELA DE CORTE** | pausar cron da origem, avisar usuários, app em manutenção | etapa 10 | alto | reabrir origem | app inacessível | escrita zerada na origem |
| 12 | Dump final | `pg_dump` final + delta de Storage | etapa 11 | alto | usar dump anterior | counts pós-dump | dump concluído sem erro |
| 13 | Carga final | truncar destino e reimportar do dump final (auth → public → storage) | etapa 12 | **crítico** | repetir com o mesmo dump | `08-validation.sql` completo | counts, fingerprints e órfãos OK |
| 14 | Cutover | trocar variáveis no Vercel + redeploy; reapontar webhooks Meta/Stripe | etapa 13 | alto | reverter variáveis | smoke test | login e dashboard operando |
| 15 | Cron no destino | criar os 6 jobs | etapa 14 | médio | `cron.unschedule` | `select * from cron.job` | 6 jobs ativos |
| 16 | Reset de senha | disparar recovery para os 7 usuários de e-mail/senha | etapas 9 e 14 | baixo | reenviar | confirmação dos usuários | todos conseguem entrar |
| 17 | Monitoramento | 48 h acompanhando logs de funções, e-mail, push, cron | etapa 14 | baixo | rollback da etapa 14 | logs sem erro | nenhum erro crítico |
| 18 | Remover Lovable Cloud | **IRREVERSÍVEL — não executar sem 7+ dias estáveis** | etapa 17 | máximo | nenhum | — | decisão explícita sua |

## Momento do backup final
O dump definitivo deve ser feito **na etapa 12, já com a origem congelada** (cron pausado e app em manutenção). Qualquer dump feito antes disso serve apenas para ensaio — registros criados depois seriam perdidos.

## Janela de manutenção
**Necessária, mas curta.** Volume é pequeno (7.750 linhas + 91,6 MB): estimativa de **30 a 60 minutos** entre congelar a origem e concluir o smoke test. Sugestão: madrugada ou domingo, sem consultas agendadas na janela (conferir `appointments` antes de escolher o horário).

## Como impedir divergência
1. Pausar os 6 cron jobs da origem antes do dump.
2. App em modo manutenção (frontend fora do ar) durante etapas 11–14.
3. Não criar cron no destino antes do cutover.
4. Webhooks externos reapontados só na etapa 14 — nunca apontando para os dois ao mesmo tempo.
