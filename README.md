# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/169fc6f4-e48d-465f-82e9-6c25572b5184

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/169fc6f4-e48d-465f-82e9-6c25572b5184) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Scaffolding

Este projeto inclui o seguinte scaffolding de ficheiros:

### Services (`src/services/`)
- `accounts.ts` - Funções para gestão de contas
- `transactions.ts` - Funções para gestão de transações
- `budgets.ts` - Funções para gestão de orçamentos
- `reports.ts` - Funções para relatórios e analytics

### Components (`src/components/`)
- `AccountList.tsx` - Lista de contas
- `AccountForm.tsx` - Formulário de conta
- `TransactionList.tsx` - Lista de transações
- `TransactionForm.tsx` - Formulário de transação
- `BudgetCard.tsx` - Card de orçamento
- `BudgetTable.tsx` - Tabela de orçamentos
- `ReportChart.tsx` - Gráfico de relatórios

Todos os ficheiros contêm stubs funcionais marcados com `// TODO` para posterior implementação.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/169fc6f4-e48d-465f-82e9-6c25572b5184) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## 🛠️ Setup do Projeto

### Pré-requisitos
- Node.js v22.14.0
- npm v11.4.1

### Instalação

1. Instala as dependências:
   ```sh
   npm install
   ```

2. Cria um ficheiro `.env.local` na raiz do projeto com o seguinte conteúdo:
   ```env
   VITE_SUPABASE_URL=https://ebitcwrrcumsvqjgrapw.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaXRjd3JyY3Vtc3ZxamdyYXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NjcyMTYsImV4cCI6MjA2ODM0MzIxNn0.hLlTeSD2VzVCjvUSXLYQypXNYqthDx0q1N86aOftfEY
   ```

3. Inicia o servidor de desenvolvimento:
   ```sh
   npm run dev
   ```

---

## 📥 Importação da Base de Dados e Configuração do Supabase

1. **Importar o dump SQL para o Supabase**
   - Acede ao painel do Supabase (https://app.supabase.com/).
   - Seleciona o teu projeto.
   - Vai a **Database** > **SQL Editor**.
   - Carrega o ficheiro de dump SQL (ex: `dump.sql`) e executa o script para criar as tabelas e dados necessários.
   - Confirma que a tabela `accounts` foi criada.

2. **Configurar variáveis de ambiente**
   - No ficheiro `.env.local`, garante que tens:
     ```env
     VITE_SUPABASE_URL=https://ebitcwrrcumsvqjgrapw.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaXRjd3JyY3Vtc3ZxamdyYXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NjcyMTYsImV4cCI6MjA2ODM0MzIxNn0.hLlTeSD2VzVCjvUSXLYQypXNYqthDx0q1N86aOftfEY
     ```
   - Se usares ambientes de teste, replica as variáveis em `.env.test`.

---

## 🔐 Autenticação de Utilizadores

### Fluxo de autenticação
- O registo e login são feitos nas páginas `/register` e `/login`.
- Apenas utilizadores autenticados podem aceder às rotas privadas (`/`, `/transacoes`, `/objetivos`, `/familia`, `/insights`).
- Utilizadores não autenticados são redirecionados automaticamente para `/login`.

### Como funciona
- O estado do utilizador é gerido pelo hook `useAuth` (`src/hooks/useAuth.ts`).
- O wrapper `<RequireAuth>` protege as rotas privadas.
- O formulário de registo pede nome, email e password. O login pede email e password.
- Mensagens de erro detalhadas são apresentadas no formulário.

### Exemplo de uso do hook
```tsx
import { useAuth } from '../hooks/useAuth';
const { user, signup, login, logout } = useAuth();
```

### Personalização
- Para alterar os campos de registo/validação, edita `src/models/authSchema.ts`.
- Para adicionar campos extra ao utilizador, usa o campo `options.data` no signup.

---
