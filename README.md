# Porta Linda Kit

## Descrição
Aplicação de gestão financeira familiar colaborativa, com autenticação, partilha de contas, objetivos, orçamentos, notificações e histórico de alterações.

---

## 🚀 Instalação e Setup Rápido

### Pré-requisitos
- Node.js >= 18
- npm >= 9

### Passos
1. Clona o repositório:
   ```sh
   git clone <repo-url>
   cd porta-linda-kit
   ```
2. Instala as dependências:
   ```sh
   npm install
   ```
3. Copia o ficheiro de variáveis de ambiente:
   ```sh
   cp .env.example .env.local
   # Preenche com as tuas credenciais do Supabase
   ```
4. Inicia o servidor de desenvolvimento:
   ```sh
   npm run dev
   ```

---

## 🗂️ Estrutura do Projeto

- `src/components/` — Componentes React reutilizáveis (forms, listas, UI, etc.)
- `src/services/` — Funções de acesso a dados (Supabase, Storage, etc.)
- `src/validation/` — Schemas Zod para validação robusta
- `src/pages/` — Páginas principais da aplicação
- `src/contexts/` — Contextos globais (ex: Auth)
- `supabase/` — Migrations, configuração e scripts SQL

---

## ⚙️ Variáveis de Ambiente

Exemplo de `.env.example`:
```
VITE_SUPABASE_URL=https://<teu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxx
```
Nunca commits o ficheiro `.env.local`!

---

## 👩‍💻 Onboarding de Developers

1. Segue os passos de instalação acima.
2. Solicita acesso ao projeto Supabase (se necessário).
3. Instala o CLI do Supabase:
   ```sh
   npm install -g supabase
   npx supabase link
   npx supabase db pull
   npx supabase db push --yes
   ```
4. Consulta o ficheiro `ONBOARDING_ROLES.md` para detalhes de roles, permissões e boas práticas.

---

## 🔑 Autenticação e Fluxos Críticos
- Registo e login em `/register` e `/login`.
- Apenas utilizadores autenticados acedem a rotas privadas.
- Proteção por roles (owner, admin, member, viewer) — ver matriz em `ONBOARDING_ROLES.md`.
- Políticas RLS ativas no backend.

## 🏠 Área Pessoal vs Finanças Partilhadas
- **Área Pessoal** (`/personal`) — Gestão financeira individual onde `family_id IS NULL`
- **Finanças Partilhadas** (`/family`) — Dados partilhados entre membros onde `family_id IS NOT NULL`
- Separação clara entre finanças pessoais e familiares
- Navegação adaptativa (tabs em mobile, sidebar em desktop)
- Contextos de dados separados com providers dedicados

---

## 🧭 Estrutura de Navegação

### Área Pessoal (`/personal`)
- **Dashboard** — Visão geral das finanças pessoais
- **Contas** — Gestão de contas bancárias e cartões de crédito pessoais
- **Objetivos** — Metas financeiras individuais
- **Orçamentos** — Orçamentos mensais pessoais
- **Transações** — Histórico de transações pessoais
- **Insights** — Análises e relatórios pessoais
- **Configurações** — Preferências pessoais

### Finanças Partilhadas (`/family`)
- **Dashboard** — Visão geral das finanças familiares
- **Objetivos** — Metas financeiras familiares partilhadas
- **Orçamentos** — Orçamentos mensais familiares
- **Contas** — Contas bancárias e cartões partilhados
- **Transações** — Histórico de transações familiares
- **Membros** — Gestão de membros da família
- **Configurações** — Configurações da família

### Navegação Adaptativa
- **Mobile (< 768px)**: TabBar fixo na parte inferior com ícones e labels
- **Desktop (≥ 768px)**: Sidebar lateral com navegação completa
- **Estado preservado**: Scroll e tab ativo mantidos ao navegar

## 📋 Scripts úteis
- `npm run dev` — Iniciar ambiente de desenvolvimento
- `npm run build` — Build de produção
- `npm run lint` — Linting do código
- `npm run test` — Testes (quando disponíveis)

---

## 📚 Documentação adicional
- [ONBOARDING_ROLES.md](./ONBOARDING_ROLES.md) — Fluxos de onboarding, roles, permissões, boas práticas
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev/)
- [Zod Docs](https://zod.dev/)

---

## 🛡️ Boas Práticas
- Mantém o `.env.local` fora do repositório (`.gitignore`)
- Usa MFA no Supabase e GitHub
- Revê roles e acessos regularmente
- Segue os padrões de código e validação definidos
- Documenta sempre alterações relevantes

---

## 🏁 Primeiros Passos para Utilizadores Finais
- Cria conta ou aceita convite por email
- Configura a tua família e adiciona membros
- Explora as páginas de contas, transações, objetivos e orçamentos
- Consulta o FAQ e onboarding visual (a adicionar)

---

> Para dúvidas ou sugestões, contacta a equipa de desenvolvimento.

## Deploy rápido

1. Pré-requisitos
   - Node 22, Supabase CLI (opcional)
   - `.env.local` com:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_BASE_PATH=/` (ou `/<repo>/` para GitHub Pages)
2. Instalar deps
   ```bash
   npm ci
   ```
3. Gerar tipos (local)
   ```bash
   npm run types:gen:local
   ```
4. Lint e testes
   ```bash
   npm run lint
   npm run test:run
   ```
5. Build
   ```bash
   npm run build
   ```
6. Preview local (opcional)
   ```bash
   npm run deploy:local
   ```

## CI/CD
- Workflow `ci.yml`: lint → lint migrações → testes → build
- Workflow `pages.yml`: deploy opcional para GitHub Pages (branch `main`)

## ♿ Checklist de Acessibilidade (A11y)
- [x] Botões de ícone têm `aria-label` descritivos (editar, eliminar, fechar, marcar como lido, etc.)
- [x] Diálogos com `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`
- [x] Foco inicial previsível ao abrir diálogos (botão Cancelar focado)
- [x] Elementos clicáveis com `tabIndex` e handlers de teclado (`Enter`) nos drill-downs
- [x] Fallbacks de carregamento com `aria-label` em Suspense/placeholders
- [x] Toasters/alertas usam componentes com `role` apropriado; considerar `aria-live="polite"` se necessário
- [x] Estados visuais de foco visíveis (classes `focus:ring`, `focus:outline-none` apenas quando combinado com estilos de foco)
- [x] Ícones apenas decorativos acompanhados por texto visível ou `aria-hidden="true"`
- [x] Contraste de texto/ícones suficiente (verificar com DevTools Lighthouse → Accessibility)
- [x] Labels para inputs/selects com `label`/`htmlFor` e `aria-*` quando aplicável

## ⌨️ Atalhos de Teclado

- Geral: pressione `/` para focar rapidamente o principal campo/controlo da página atual.
- Mapeamento atual:
  - `/personal/transactions`: foca a pesquisa de transações.
  - `/family/transactions`: foca a pesquisa de transações familiares.
  - `/reports`: foca a Data Início.
  - `/insights`: foca o botão Exportar.
  - `/personal/budgets`: foca o filtro de mês.
  - `/family/budgets`: foca o filtro de mês.
  - `/family/members`: abre o modal de convite (se fechado) e foca o email.

Notas:
- O atalho `/` é ignorado quando estás a escrever em inputs/textarea.
- Existem dicas visuais junto dos campos com `<kbd>/</kbd>` para lembrar o atalho.

## Scripts úteis
- `types:gen`: gera tipos do projeto remoto (requer `project-id`/auth)
- `types:gen:local`: gera tipos da base local
- `db:lint`: lint das migrações
- `prebuild`: valida env e base path

## Publicação (detalhado)

1. Variáveis de ambiente locais
   - Cria `.env.local` (podes basear-te em `.env.local.example`):
     - `VITE_SUPABASE_URL=http://127.0.0.1:54321`
     - `VITE_SUPABASE_ANON_KEY=...` (chave demo local do Supabase)
     - `VITE_BASE_PATH=/` (ou `/<repo>/` para Pages)

2. Build local
   ```bash
   npm ci
   npm run types:gen:local
   npm run test:run
   npm run build
   ```

3. CI/CD (GitHub Actions)
   - Workflow `CI` já criado: lint → migrações → testes → build
   - Workflow `Deploy to GitHub Pages` (opcional) já criado

4. Secrets no repositório (Settings → Secrets and variables → Actions → New repository secret)
   - Para CI (se necessário):
     - `VITE_SUPABASE_URL` (ex.: `http://127.0.0.1:54321` para build em CI)
     - `VITE_SUPABASE_ANON_KEY` (chave demo local)
     - (opcional) `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_ID` se quiseres comandos remotos da CLI
   - Para Deploy Pages:
     - `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` conforme o backend escolhido

5. Ativar GitHub Pages (opcional)
   - Settings → Pages → Build and deployment → Source: GitHub Actions
   - O workflow `pages.yml` publica a pasta `dist/`

## EP1 — Despesas Recorrentes & Subscrições (MVP)

- Migrações: criam `recurring_rules` e `recurring_instances` com RLS para pessoal/familiar.
- Edge Function: `recurrents_run` — gera instâncias (idempotente via `unique(rule_id, period_key)`).
- UI: `/personal/recorrentes` e `/family/recorrentes` (mobile-first).

### Setup

1) Aplicar migrações:
```bash
supabase db push
```

2) Deploy da função:
```bash
supabase functions deploy recurrents_run --no-verify-jwt
```

3) Scheduler diário (03:00 UTC):
- Exigir extensões `pg_net` e `pg_cron` ativas. A migração `20250812010100_scheduler_recurrents.sql` cria `run_recurrents_now()` e agenda com `cron.schedule`.

4) Desenvolvimento local:
- Endpoint preview: `POST /recurrents_run?preview=1&days=30`

5) Testes
```bash
npm run test -s
```

### Notas
- RLS: pessoal por `user_id=auth.uid()`, familiar por helpers `is_member_of_family` e `is_family_editor`.
- Próximos passos: filtros/ações avançadas, ligação a contas/cartões, proration e multi-moeda.