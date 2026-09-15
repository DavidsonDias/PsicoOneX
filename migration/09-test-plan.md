# 09 — Checklist de testes pós-migração

Executar no ambiente do Supabase externo, com pelo menos 3 contas reais (1 super admin, 1 psicólogo, 1 paciente do portal).

## Auth
- [ ] Login por e-mail e senha (após reset)
- [ ] Login por **username** (RPC `get_email_by_username`)
- [ ] Login com Google (conta existente → mesmo UUID, dados aparecem)
- [ ] "Esqueci minha senha" → e-mail recebido → redefinição → login
- [ ] Magic link
- [ ] Cadastro de novo usuário → `profiles` + `user_roles` + `subscriptions` criados pelos triggers
- [ ] Logout / login novamente / refresh de token
- [ ] Reabrir PWA com sessão salva
- [ ] Super admin acessa `/super-admin`; psicólogo é redirecionado ao dashboard

## RLS e isolamento
- [ ] Psicólogo A não vê pacientes/prontuários/financeiro de B
- [ ] Paciente do portal vê só os próprios dados
- [ ] Paciente não consegue alterar colunas clínicas do próprio cadastro (trigger de colunas)
- [ ] Usuário comum não consegue alterar a própria assinatura
- [ ] Tabelas de token não expostas por leitura direta

## Núcleo clínico
- [ ] Criar/editar paciente (obrigatório apenas nome e telefone)
- [ ] Agendamento simples e recorrente; sessão de teleatendimento criada automaticamente
- [ ] Prontuário: criar, editar, autosave, versões, favorito
- [ ] Anexo: upload, listagem, preview, download, exclusão
- [ ] Rascunhos (IndexedDB + tabela `drafts`) recuperados após recarregar
- [ ] Onboarding do paciente por link, com logo da clínica
- [ ] Lixeira: soft delete e restauração por super admin

## Financeiro
- [ ] Lançamento avulso e recorrente
- [ ] Registrar pagamento vinculado à parcela do plano
- [ ] Reconciliação
- [ ] Link de cobrança Stripe + retorno de pagamento
- [ ] Cron de ciclo de cobrança
- [ ] Visualização "Por Paciente" como padrão

## Comunicação
- [ ] Notificação interna (realtime)
- [ ] Web Push (VAPID novo)
- [ ] E-mail de confirmação/lembrete de consulta
- [ ] Botão "Teste completo" (push + interna + e-mail)
- [ ] WhatsApp: envio manual + webhook de status
- [ ] Unsubscribe e suppression

## Teleatendimento
- [ ] Link `/sala/<token>` abre para paciente sem login
- [ ] Vídeo/áudio bidirecional, sala de espera, chat
- [ ] Notas em tempo real e resumo pós-sessão

## IA (comportamento congelado — só verificar que segue funcionando)
- [ ] Transcrição em sessão longa, com parada segura e sem perda
- [ ] Refinamento de prontuário e geração de prontuário
- [ ] Dashboard carrega **sem** chamada de IA; botão "Analisar com IA" funciona e usa cache diário
- [ ] Perfil clínico / resumo de período reaproveitando cache
- [ ] Busca textual local primeiro; busca semântica só sob clique

## Integrações
- [ ] Google Calendar: conectar (novo redirect URI) e sincronizar
- [ ] Stripe: checkout, portal, webhook
- [ ] Cron jobs disparando nos horários corretos

## SQL de comparação
Rodar `01-preflight.sql` na origem e `08-validation.sql` no destino e conferir:
- row counts idênticos por tabela (total 7.750 em `public`, 14 usuários, 15 identities)
- fingerprints de UUID iguais (users, profiles, patients, appointments, records, financial)
- 0 linhas em todas as checagens de órfãos
- `schema_fingerprint` igual
- 121 policies em `public`, 9 em `storage`, 31 funções, RLS ativo em todas as tabelas
- 29 objetos de storage, todo `file_path` de anexo existente no bucket
