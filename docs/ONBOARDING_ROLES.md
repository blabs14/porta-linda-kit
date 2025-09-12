# Onboarding & Gestão de Roles — Family Flow Finance

## 1. Onboarding de Novos Developers

### Passos para entrar no projeto:
1. **Acesso ao Repositório:**
   - Solicita acesso ao repositório GitHub.
   - Clona o projeto: `git clone <repo-url>`
2. **Configuração Local:**
   - Instala dependências: `npm install` ou `bun install`
   - Copia `.env.example` para `.env.local` e preenche com as tuas credenciais do Supabase.
   - Garante que tens acesso ao painel Supabase do projeto.
3. **Acesso ao Supabase:**
   - Solicita convite para o projeto Supabase (se necessário).
   - Instala o CLI: `npm install -g supabase`
   - Liga o projeto local: `npx supabase link`
4. **Migrações e Base de Dados:**
   - Sincroniza as migrações: `npx supabase db pull`
   - Aplica novas migrações: `npx supabase db push --yes`
5. **Boas práticas de desenvolvimento:**
   - Mantém o `.env.local` fora do repositório (`.gitignore`).
   - Usa branches para novas features/bugs.
   - Escreve commits claros e concisos.
   - Executa `npm run lint` antes de submeter PRs.
   - Consulta este ficheiro sempre que houver dúvidas sobre roles ou permissões.

---

## 2. Onboarding de Utilizadores Finais

### Primeiros Passos
- Cria conta na página de registo ou aceita convite por email.
- Após login, configura a tua família e adiciona membros.
- Explora as páginas de contas, transações, objetivos e orçamentos.
- Usa o menu lateral para navegar entre funcionalidades.

### FAQ Rápido
- **Como recuperar password?**
  - Usa o link “Esqueci-me da password” na página de login.
- **Como convidar familiares?**
  - Vai à página “Família” e usa o botão “Convidar membro”.
- **Como alterar permissões?**
  - Só owners/admins podem alterar roles dos membros na gestão de família.

### Contacto de Suporte
- Para dúvidas ou problemas, contacta: [teu-email@dominio.com]

---

## 3. Gestão de Roles e Permissões

### Roles Disponíveis
- **owner**: Dono da família, permissões totais (inclui gestão de membros, settings, etc.)
- **admin**: Permissões avançadas (gerir membros, aprovar transações, etc.)
- **member**: Utilizador normal, pode adicionar/editar transações e objetivos.
- **viewer**: Apenas leitura dos dados da família.

### Matriz de Permissões
| Permissão                | owner | admin | member | viewer |
|--------------------------|:-----:|:-----:|:------:|:------:|
| Gerir membros            |   X   |   X   |        |        |
| Gerir settings           |   X   |   X   |        |        |
| Adicionar transações     |   X   |   X   |   X    |        |
| Editar objetivos         |   X   |   X   |   X    |        |
| Ver dados da família     |   X   |   X   |   X    |   X    |
| Convidar membros         |   X   |   X   |        |        |
| Aprovar transações       |   X   |   X   |        |        |
| Remover membros          |   X   |   X   |        |        |
| Eliminar família         |   X   |       |        |        |

---

## 4. Boas Práticas de Segurança
- Nunca partilhes credenciais ou tokens em canais públicos.
- Usa sempre autenticação de dois fatores (MFA) no Supabase e GitHub.
- Mantém o `.env` fora do repositório (usa `.gitignore`).
- Revê regularmente as roles e remove acessos desnecessários.
- Garante que as políticas RLS estão ativas e corretas.
- Não uses a `service_role` do Supabase no frontend.
- Roda as chaves/API keys periodicamente.

---

## 5. Exemplo de `.env.example`
```
VITE_SUPABASE_URL=https://<teu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxx
```

---

## 6. Fluxo de Saída (Offboarding)
- Remove o utilizador do Supabase e do GitHub quando sair da equipa.
- Remove o membro da família (ou desativa) se for utilizador final.
- Revoga tokens e acessos a serviços externos.

---

> **Mantém este ficheiro atualizado sempre que houver alterações nos fluxos de onboarding, roles ou permissões!**