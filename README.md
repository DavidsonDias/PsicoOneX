<p align="center">
  <img src="public/icons/icon-512.png" alt="PsicoOne Logo" width="120" height="120" />
</p>

<h1 align="center">🧠 PsicoOne</h1>

<p align="center">
  <strong>Sistema SaaS inteligente para gestão completa de psicólogos e clínicass</strong>
</p>

<p align="center">
  Prontuário • Agenda • Financeiro • Documentos • Relatórios • IA
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
</p>

---

## 📖 Visão Geral

**PsicoOne** é uma plataforma SaaS premium projetada para revolucionar a gestão de consultórios e clínicas de psicologia. Combinando tecnologia de ponta com uma experiência de usuário intuitiva, o sistema centraliza prontuários eletrônicos, agenda inteligente, controle financeiro, emissão de documentos e insights gerados por IA — tudo em uma única solução segura e escalável.

### 🎯 Público-Alvo

| Perfil | Necessidade |
|---|---|
| **Psicólogos autônomos** | Gestão completa do consultório em uma única ferramenta |
| **Clínicas de psicologia** | Controle multi-profissional com permissões granulares |
| **Consultórios multidisciplinares** | Escalabilidade e organização centralizada |

### 💡 Problema que Resolve

Profissionais de psicologia frequentemente lidam com ferramentas fragmentadas — planilhas para financeiro, papel para prontuários, WhatsApp para agendamentos. O PsicoOne elimina essa fragmentação, oferecendo:

- **Centralização total** — todos os processos em um só lugar
- **Conformidade com o CFP** — prontuários eletrônicos dentro das normas
- **Preparação para LGPD** — dados sensíveis com criptografia e controle de acesso
- **Inteligência artificial** — insights automatizados para tomada de decisão

### 🏆 Diferenciais Competitivos

- ✅ Interface moderna e responsiva (Desktop + Mobile)
- ✅ Prontuário eletrônico com histórico completo e anexos
- ✅ Agenda com detecção de conflitos e recorrência
- ✅ Financeiro integrado com projeções e categorização
- ✅ IA embarcada para insights clínicos e financeiros
- ✅ Sistema de roles multi-nível (Super Admin, Admin, Psicólogo, Secretária)
- ✅ Modelo SaaS com trial automático e gestão de planos
- ✅ PWA ready — instalável como aplicativo

---

## 🚀 Principais Funcionalidades

### 🔐 Autenticação & Segurança

| Recurso | Descrição |
|---|---|
| Login com E-mail | Cadastro com verificação de e-mail obrigatória |
| Login com Google | OAuth 2.0 via Google Cloud Console |
| Recuperação de senha | Fluxo completo com e-mail de reset |
| Controle de permissões | 4 níveis: `super_admin`, `admin`, `psychologist`, `secretary` |
| Sessão segura | JWT com refresh automático e persistência em localStorage |
| LGPD Ready | Dados sensíveis protegidos com RLS e criptografia |

### 👥 Gestão de Pacientes

- Cadastro completo com dados pessoais, contato de emergência e observações
- Filtros avançados por nome, status e período
- Ações em massa (inativação, exclusão)
- Exportação individual ou total (PDF, Excel, CSV)
- Importação via CSV para migração de dados
- Soft delete com lixeira e possibilidade de restauração

### 📋 Prontuário Eletrônico

- Registro detalhado por sessão (queixas, evolução, técnicas, próximos passos)
- Templates de sessão personalizáveis
- Editor de texto livre para anotações clínicas
- Upload de anexos (laudos, exames, documentos)
- Histórico cronológico (timeline) por paciente
- Numeração automática de sessões
- Associação com agendamentos

### 📅 Agenda Inteligente

- Visualização semanal com overview diário
- Status granulares: `Agendado`, `Confirmado`, `Pendente`, `Cancelado`, `Remarcado`, `Concluído`
- Detecção automática de conflitos de horário
- Agendamentos recorrentes (semanal, quinzenal, mensal)
- Lembretes e notificações automáticas
- Estatísticas rápidas (taxa de presença, cancelamentos)
- Integração com prontuário e financeiro

### 💰 Gestão Financeira

- Controle de receitas e despesas
- Categorização por centro de custo
- Status financeiro: `Pago`, `Pendente`, `Atrasado`, `Cancelado`
- Gráficos de evolução de receita (Recharts)
- Projeções financeiras inteligentes
- Análise por categoria
- Emissão de NF e controle fiscal (tax_rate, tax_amount)
- Exportação de relatórios financeiros

### 📑 Documentos & Receitas

- Templates de documentos personalizáveis
- Histórico completo de documentos emitidos
- Preview de documentos antes da emissão
- Assinatura digital (SignaturePad)
- Exportação em PDF (jsPDF)

### 🤖 Insights com IA

- Análise inteligente de padrões na agenda
- Insights financeiros automatizados
- Geração de prontuários assistida por IA
- Sugestões de otimização da prática clínica
- Modelos suportados: Gemini, GPT-5

### 📊 Relatórios & Escalas

- Relatórios consolidados por período
- Escalas psicológicas padronizadas
- Dashboard com métricas em tempo real
- Exportação em múltiplos formatos (PDF, XLSX)

### 🔔 Notificações

- Central de notificações in-app
- Notificações por tipo (agenda, financeiro, sistema)
- Marcação de leitura individual e em massa
- Ações rápidas diretamente da notificação

### 🖥️ Teleatendimento

- Módulo preparado para sessões online
- Integração futura com plataformas de videoconferência

---

## 🛠️ Stack Tecnológica

### Frontend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| React | 18.3 | Biblioteca de UI |
| TypeScript | 5.8 | Tipagem estática |
| Vite | 5.4 | Build tool & dev server |
| Tailwind CSS | 3.4 | Framework de estilos utilitário |
| Shadcn/UI | Latest | Componentes UI acessíveis (Radix UI) |
| Framer Motion | 12.x | Animações e transições |
| React Router | 6.x | Roteamento SPA |
| React Query | 5.x | Gerenciamento de estado server-side |
| Recharts | 2.x | Gráficos e visualização de dados |
| React Hook Form + Zod | Latest | Formulários com validação |
| jsPDF | 4.x | Geração de PDFs |
| date-fns | 3.x | Manipulação de datas |

### Backend & Infraestrutura

| Tecnologia | Finalidade |
|---|---|
| Supabase | Backend-as-a-Service (BaaS) |
| PostgreSQL | Banco de dados relacional |
| Supabase Auth | Autenticação (Email + OAuth) |
| Edge Functions (Deno) | Lógica de servidor serverless |
| Row Level Security (RLS) | Segurança a nível de linha |
| Vercel | Deploy e hosting |
| GitHub | Versionamento e CI/CD |
| PWA (vite-plugin-pwa) | Progressive Web App |

---

## 📁 Arquitetura do Projeto

```
psicoone/
├── public/
│   ├── icons/              # Ícones PWA (192px, 512px)
│   ├── manifest.json       # Configuração PWA
│   └── robots.txt          # SEO
│
├── src/
│   ├── components/
│   │   ├── ui/             # Componentes base (Shadcn/UI + customizados)
│   │   ├── layout/         # AppLayout, Sidebar, CommandPalette, MobileHeader
│   │   ├── agenda/         # Timeline, ConflictDetector, DayOverview, QuickStats
│   │   ├── dashboard/      # InsightsPanel, RevenueChart, WeeklyCalendar
│   │   ├── documents/      # Templates, Preview, SignaturePad, History
│   │   ├── financial/      # Charts, Projections, CategoryAnalysis, Transactions
│   │   ├── medical-records/# Editor, Timeline, Templates, Attachments, RecordCard
│   │   ├── patients/       # PatientCard, DetailSheet, BulkActions, ImportCSV
│   │   ├── notifications/  # NotificationCenter
│   │   ├── subscription/   # SubscriptionBanner
│   │   └── landing/        # CTA, FAQ, Integrations, Testimonials, TrustBadges
│   │
│   ├── pages/              # Rotas da aplicação
│   │   ├── Index.tsx        # Landing page
│   │   ├── Auth.tsx         # Login / Cadastro
│   │   ├── Dashboard.tsx    # Painel principal
│   │   ├── Patients.tsx     # Gestão de pacientes
│   │   ├── Agenda.tsx       # Agenda inteligente
│   │   ├── MedicalRecords.tsx # Prontuários
│   │   ├── Financeiro.tsx   # Gestão financeira
│   │   ├── Documentos.tsx   # Receitas e documentos
│   │   ├── Relatorios.tsx   # Relatórios
│   │   ├── Configuracoes.tsx# Configurações do sistema
│   │   ├── SuperAdmin.tsx   # Painel super admin
│   │   └── ...              # Demais páginas
│   │
│   ├── hooks/              # Custom hooks
│   │   ├── useAuthRedirect.ts    # Redirecionamento pós-OAuth
│   │   ├── useUserRole.ts        # Controle de permissões
│   │   ├── useSubscription.ts    # Status do plano
│   │   ├── useNotifications.ts   # Notificações
│   │   └── useSidebarState.ts    # Estado da sidebar
│   │
│   ├── contexts/           # Context API
│   │   └── SidebarContext.tsx
│   │
│   ├── integrations/       # Integrações externas
│   │   ├── supabase/       # Client, types (auto-gerados)
│   │   └── lovable/        # Lovable Cloud Auth
│   │
│   ├── lib/                # Utilitários
│   │   ├── utils.ts        # Helpers gerais
│   │   └── export-utils.ts # Exportação PDF/Excel
│   │
│   └── index.css           # Design system (tokens, temas)
│
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   │   ├── ai-insights/    # Insights com IA
│   │   ├── generate-medical-record/ # Geração de prontuário com IA
│   │   ├── send-notification/       # Envio de notificações
│   │   └── expire-trials/           # Expiração automática de trials
│   └── config.toml         # Configuração das Edge Functions
│
└── package.json
```

### Responsabilidade das Camadas

| Camada | Responsabilidade |
|---|---|
| `components/ui/` | Componentes atômicos reutilizáveis do design system |
| `components/{módulo}/` | Componentes específicos de cada domínio |
| `pages/` | Páginas/rotas — orquestram componentes e dados |
| `hooks/` | Lógica reutilizável (auth, roles, subscription) |
| `contexts/` | Estado global compartilhado via Context API |
| `integrations/` | Clientes e tipos de serviços externos |
| `lib/` | Funções utilitárias puras |
| `supabase/functions/` | Lógica de servidor (Edge Functions Deno) |

---

## 🔑 Fluxo de Autenticação

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Tela Login  │────▶│  Supabase    │────▶│  Google OAuth    │
│  (Auth.tsx)  │     │  Auth        │     │  Consent Screen  │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                    ┌──────────────┐                │
                    │  Callback    │◀───────────────┘
                    │  (/ + hash)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ useAuth      │
                    │ Redirect     │─── Polling + onAuthStateChange
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ user_roles   │─── Consulta role do usuário
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
     /super-admin              /dashboard
     (Super Admin)             (Demais roles)
```

### Detalhes do Fluxo

1. **Início** — Usuário clica em "Entrar com Google" ou submete email/senha
2. **OAuth** — Supabase Auth redireciona para Google Consent Screen (ambiente Lovable usa provider alternativo)
3. **Callback** — Google redireciona de volta com `access_token` no hash da URL
4. **Processamento** — `useAuthRedirect` detecta o token, aguarda o Supabase processar via polling + listener
5. **Role Check** — Consulta `user_roles` para determinar destino
6. **Redirecionamento** — Navega para `/super-admin` ou `/dashboard` conforme o papel
7. **Limpeza** — Hash da URL é removido após processamento bem-sucedido

---

## 💳 Modelo SaaS

### Planos Disponíveis

| Plano | Descrição | Status |
|---|---|---|
| **Trial** | 7 dias úteis gratuitos (exclui fins de semana) | ✅ Ativo |
| **Basic** | Funcionalidades essenciais | 🔜 Em breve |
| **Pro** | Funcionalidades avançadas + IA | 🔜 Em breve |
| **Enterprise** | Multi-clínica + suporte dedicado | 🔜 Em breve |

### Ciclo de Vida da Assinatura

```
Cadastro ──▶ Trial (7 dias úteis) ──▶ Expirado ──▶ Modo Leitura
                                         │
                                         ▼
                                    Upgrade de Plano ──▶ Ativo
```

### Modo Leitura (Pós-Expiração)

Após o trial expirar sem upgrade:
- ✅ **Permitido:** Visualizar todos os dados existentes
- ❌ **Bloqueado:** Criar, editar ou excluir registros
- 🔔 **Banner:** Exibição permanente solicitando upgrade

### Controle de Status

| Status | Descrição |
|---|---|
| `active` | Plano ativo e funcional |
| `trial` | Período de avaliação |
| `expired` | Trial/plano expirado |
| `blocked` | Bloqueado por administrador |
| `suspended` | Suspenso temporariamente |
| `cancelled` | Cancelado pelo usuário |

---

## 🛡️ Segurança e Conformidade

### Camadas de Proteção

| Camada | Implementação |
|---|---|
| **Autenticação** | JWT com refresh automático, OAuth 2.0 |
| **Autorização** | RBAC com 4 níveis de permissão |
| **Banco de Dados** | Row Level Security (RLS) em todas as tabelas |
| **Multi-tenancy** | Isolamento de dados por `psychologist_id` |
| **Soft Delete** | Registros deletados mantidos com `deleted_at` |
| **Auditoria** | Tabela `audit_logs` com rastreamento completo |
| **Sessão** | Persistência segura com auto-refresh |

### Row Level Security (RLS)

Todas as tabelas possuem RLS habilitado, garantindo que:
- Psicólogos só acessam seus próprios pacientes e dados
- Super Admins têm visão global para gestão da plataforma
- Secretárias acessam apenas dados autorizados pelo admin
- Nenhuma query bypassa as políticas de segurança

### Preparação LGPD

- Dados sensíveis isolados por profissional
- Audit trail completo de todas as operações
- Soft delete para controle de retenção
- Consentimento explícito no cadastro
- Preparação para exportação e exclusão de dados pessoais

---

## ⚙️ Ambiente e Deploy

### Variáveis de Ambiente

```env
# Supabase (auto-configurado pelo Lovable Cloud)
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=[project-id]
```

### Deploy na Vercel

1. Conecte o repositório GitHub ao Vercel
2. Configure as variáveis de ambiente
3. Build command: `npm run build`
4. Output directory: `dist`
5. Framework preset: Vite

### Configuração Google OAuth

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto e ative a API de OAuth
3. Configure as URLs de callback autorizadas
4. Adicione o Client ID e Secret no Supabase Auth
5. Configure a tela de consentimento com branding "PsicoOne"

---

## 🗺️ Roadmap Estratégico

### Q1 2026 — Consolidação

- [x] Prontuário eletrônico completo
- [x] Agenda com recorrência e conflitos
- [x] Financeiro com gráficos e projeções
- [x] Sistema de roles e permissões
- [x] Trial automático com bloqueio
- [x] Login com Google OAuth
- [ ] Proteção de rotas (guard de autenticação)
- [ ] Multi-usuário por clínica (secretária, estagiário)

### Q2 2026 — Expansão

- [ ] Dashboard avançado com BI financeiro
- [ ] Integração com gateway de pagamento (Stripe/Asaas)
- [ ] Notificações por e-mail e WhatsApp
- [ ] Teleatendimento integrado (videochamada)
- [ ] App mobile (React Native / PWA otimizado)

### Q3 2026 — Inteligência

- [ ] IA para análise de padrões clínicos
- [ ] Sugestões automatizadas de tratamento
- [ ] Relatórios preditivos
- [ ] Integração com calendário externo (Google Calendar)
- [ ] API pública para integrações

### Q4 2026 — Enterprise

- [ ] Multi-clínica com gestão centralizada
- [ ] Marketplace de escalas psicológicas
- [ ] White-label para redes de clínicas
- [ ] Certificações de segurança (ISO 27001)
- [ ] Expansão internacional (multi-idioma)

---

## 🧑‍💻 Desenvolvimento Local

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/psicoone.git

# Navegue até o diretório
cd psicoone

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

---

## 📄 Licença

Este projeto é **proprietário** e protegido por direitos autorais.  
Todos os direitos reservados © 2025-2026 **[SevenDevX](https://SevenDevX.com)**.

**Powered by SevenDevX**

---

## 🏷️ Governança Técnica

Este sistema segue o **Padrão Corporativo de Engenharia, Arquitetura e Governança Tecnológica da SevenDevX (Enterprise v2)**.

- Assinatura técnica invisível integrada
- Validação de integridade no boot da aplicação
- Auditoria de alterações via `audit_logs`
- Rastreabilidade completa do software

---

<p align="center">
  Desenvolvido com 💜 por <strong><a href="https://SevenDevX.com" target="_blank">SevenDevX</a></strong>
</p>

<p align="center">
  <em>PsicoOne — Gestão Inteligente, Cuidado Humano.</em>
</p>
