# Auth Refresh Hardening — Design

Resumo da Arquitetura
- Contexto: React + Vite + Supabase JS v2. O AuthContext centraliza sessão/estado e RequireAuth faz gating de rotas.
- Objetivo: Garantir inicialização determinística do estado de auth e reduzir redirects falsos.

Componentes
1) supabaseClient.ts
- Mantém createClient<Database>(..., { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }).
- Sem timers custom; confiar no SDK para refresh e multi-tab.

2) AuthContext.tsx
- Estado: { user, session, loading, authInitialized }.
- Efeitos:
  a. Bootstrap inicial: await supabase.auth.getSession(); set session/user; set authInitialized=true; set loading=false.
  b. Subscrição única: supabase.auth.onAuthStateChange(handleAuthEvent).
- Funções: signInWithPassword, signUp, resetPasswordForEmail, signOut.
- Logs condicionais por VITE_DEBUG_AUTH.
- Garantias:
  - Nunca fazer redirect aqui; apenas gerir estado.
  - Debounce mínimo de setState para evitar renders duplos (opcional).

3) RequireAuth.tsx
- Usa useAuth().
- Se loading || !authInitialized → render spinner/skeleton.
- Se authInitialized && !user → redirect /login.
- Se user → render children.
- Pequena melhoria de logs condicionais por VITE_DEBUG_AUTH.

Estratégia de Estados
- loading: verdadeiro durante bootstrap; falso após primeira resolução de getSession.
- authInitialized: verdadeiro após bootstrap concluir (com ou sem sessão).
- user/session: sincronizados por bootstrap e eventos.

API/Contratos (sem alterações externas)
- Contexto expõe: user, session, loading, authInitialized, signIn, signUp, resetPassword, signOut.
- Não altera rotas nem endpoints.

Erros e Observabilidade
- Categorizar eventos: INIT_START, INIT_DONE(hasSession), EVENT_<NAME>.
- console.debug / console.warn condicionais: VITE_DEBUG_AUTH === 'true'.
- Nunca logar tokens; logar apenas tipos/ids.

Testes (alto nível)
- Integração: 
  1. Sessão persistida → refresh → RequireAuth não redireciona.
  2. Sessão inexistente → RequireAuth redireciona após init.
  3. TOKEN_REFRESHED → estado mantém user.
  4. SIGNED_OUT → redirect controlado em RequireAuth.

Migrações/DB
- N/A.

Riscos e Mitigações
- Duplicação de ficheiro authcontext.tsx: remover do repo.
- Múltiplas subscrições: assegurar cleanup em useEffect return.
- Condições de corrida: bloquear redirect até authInitialized.

Plano de Implementação
- Passo 1: Ajustar AuthContext com authInitialized e logs condicionais.
- Passo 2: Ajustar RequireAuth para respeitar authInitialized.
- Passo 3: Remover src/contexts/authcontext.tsx.
- Passo 4: Smoke test manual (refresh em rotas /app, /app/reports, /app/accounts).

Notas de Performance
- setState agrupados para reduzir renders.
- Evitar dependências no effect que recriem a subscrição.