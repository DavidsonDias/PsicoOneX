# Proposta de isolamento do PsicoOneX — não publicada

Base GitHub conferida: 4414470ae3975568c7555f0869f5d02d0430434d.
Preparação autorizada em branch local codex/staging-isolation. Não há remote configurado: push/PR podem criar preview automático na Vercel e precisam de autorização separada.

## Alterações propostas

- Pausa explícita de 22 funções ainda não validadas para efeitos externos: lista exata em tests/staging-blocked-functions.json. Retornam 503/STAGING_INTEGRATION_PAUSED antes de autenticar, consultar banco ou executar o handler original. OPTIONS retorna 204 com origem fixa do staging. Não existe flag/secret para contornar a pausa; liberação exige revisão de código por integração.
- Escopo: Google Calendar, WhatsApp/Meta, push, IA/áudio, diagnósticos externos, distribuição de notificações e três funções Stripe que não tinham trava de teste. Isso indisponibiliza temporariamente essas funcionalidades caso seja publicado. Não confundir com implantação já realizada.
- Removidas as duas variáveis não-VITE da origem no .env rastreado. VITE_SUPABASE_* do staging preservadas. Nenhum secret de servidor incluído.
- Fallback do webhook WhatsApp alterado para o destino; metadados, sitemap e links de convite/portal/lembrete ajustados para psicoonex.vercel.app. Links sensíveis de convite/portal não aceitam APP_BASE_URL/SITE_URL restaurados nem Origin do chamador como destino.
- A migração histórica que continha dispatch-notification da origem agora define o dispatcher como no-op, preservando schema e gatilhos. Isso protege replay dessa migração neste remix; NÃO é uma migração nova nem uma atualização do banco existente. Não reaplicar todo o histórico (outras migrações podem instalar extensões/automatismos). A alteração é exclusiva desta cópia staging e não deve ser copiada ao projeto original.
- Inicialização VAPID movida para depois da pausa, evitando falha de inicialização com credenciais ausentes antes da resposta de isolamento.

## Preservado

Recuperação de senha e testes, Auth.tsx, useAuthRedirect.ts, ResetPassword.tsx, create-checkout de teste, check-subscription local, process-email-queue e send-transactional-email validados permanecem sem diferença de conteúdo em relação à base.

Não há bloqueio universal de toda saída do app: os dois caminhos de e-mail validados, Auth/SMTP, checkout test e login Google do frontend permanecem com seu comportamento anterior. Não executar ações integradas nesta fase. Os contratos antigos de chamadores de e-mail, OAuth/SMTP, tokens Google restaurados, inscrições push, secrets e Storage continuam pendentes. Esta proposta não apaga nem anonimiza dados restaurados.

## Validação local

- node --no-warnings tests/staging-isolation.cjs: 132 requisições simuladas em 22 handlers, com/sem credenciais sintéticas; GET/POST bloqueados e OPTIONS atendido sem chamadas aos mocks de banco, Stripe, push ou rede. Dependências remotas são substituídas por mocks, não baixadas/executadas.
- node --no-warnings tests/checkout.cjs: 18 verificações aprovadas sobre o arquivo da branch.
- node --no-warnings tests/email-producer.cjs: 8 cenários aprovados sobre o arquivo da branch.
- node --no-warnings tests/email-worker.cjs: 13 cenários aprovados sobre o arquivo da branch.
- node node_modules/vitest/vitest.mjs run --config vitest.recovery.config.ts: 12 testes de recuperação aprovados.
- git diff --check: sem problemas de whitespace.
- Busca pelo ref da origem em .env, src, supabase/functions e supabase/migrations: nenhuma ocorrência. Referências históricas em migration/ foram mantidas como documentação.
- Revisão React: alterações de strings apenas; sem novo hook, estado, efeito ou dependência nos componentes.
- Build completo APROVADO em 24/09: Vite 5.4.21, 4.596 módulos, 16,59 segundos; PWA gerada com 165 entradas no precache. Usada cópia auxiliar da configuração com __dirname restrito ao módulo e chamada programática build(configFile:false), contornando o carregador esbuild no Windows. vite.config.ts e dependências não alterados. Nenhum identificador do projeto antigo encontrado nos JS/HTML/CSS/JSON gerados. A instalação limpa de dependências não foi repetida.

## Antes de publicar

1. Revisar o diff e a consequência de indisponibilizar as 22 funções.
2. Compilação local concluída. Confirmar também o build CI/preview após autorização de publicação; instalação limpa das dependências permanece uma verificação distinta.
3. Comparar novamente a main e aplicar o patch sobre um checkout Git real do commit base. Esta branch local nasceu de snapshot verificado dos arquivos; não publicar seu histórico sintético como ancestral da main.
4. Autorizar separadamente push/PR (pode gerar preview), merge e eventual deploy de Edge Functions. Nenhuma dessas ações está sendo executada agora.
5. Deploy futuro de cada função pausada precisa incluir _shared/staging-isolation.ts. Publicar frontend na Vercel não publica essas Edge Functions automaticamente.
6. Manter jobs desligados. Não alterar tokens, secrets, OAuth, Storage, planos ou produção original neste pacote.

Reversão futura: restaurar os arquivos a partir do commit base apenas após revisão. Nunca remover a pausa para testar usando credenciais restauradas. A implantação original não foi modificada.

Referências consultadas: https://supabase.com/changelog e https://supabase.com/docs/guides/functions/secrets. A proposta não depende de API nova nem altera secrets gerenciados.
