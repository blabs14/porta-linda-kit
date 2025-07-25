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

---

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
