# Auth Refresh Hardening — Requisitos (EARS)

Introdução
- Valor de negócio: Eliminar redirects indevidos para /login em refresh com sessão válida, reduzir flicker, tornar a autenticação previsível e observável, e remover duplicações que causam flakiness em CI/Dev. Escopo: Frontend (AuthContext, RequireAuth, integração com Supabase JS). Fora de escopo: alterações a backend/DB.

Terminologia
- Sessão: objeto devolvido por supabase.auth.getSession() (user + tokens).
- Inicialização (authInitialized): flag que indica que a app já fez o bootstrap de sessão e subscrições.

Requisitos Funcionais
R1. Bootstrap de sessão
- User Story: Como utilizador autenticado, quero que um refresh da página mantenha a minha sessão, para não ser redirecionado para /login.
- WHEN a app arranca ou ocorre um refresh, THE SYSTEM SHALL bloquear o acesso a rotas protegidas até resolver supabase.auth.getSession().
- IF getSession() devolve uma sessão válida, THEN THE SYSTEM SHALL definir {user, session} e NÃO redirecionar para /login.
- IF getSession() falhar (erro) ou devolver null, THEN THE SYSTEM SHALL manter o utilizador como não autenticado e permitir RequireAuth decidir o redirect.

R2. Subscrição de estado de auth
- User Story: Como developer, quero que a app reaja a eventos de auth sem duplicações, para manter o estado consistente.
- ON supabase.auth.onAuthStateChange, THE SYSTEM SHALL subscrever uma única vez e tratar eventos SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY.
- WHILE a subscrição estiver ativa, THE SYSTEM SHALL atualizar o estado {user, session} conforme o evento.
- ON unmount, THE SYSTEM SHALL remover a subscrição.

R3. Refresh de tokens
- User Story: Como utilizador, quero que a sessão se renove automaticamente sem me desconectar.
- WHEN ocorrer TOKEN_REFRESHED, THE SYSTEM SHALL atualizar a sessão em memória e não disparar redirect.
- WHILE autoRefreshToken estiver ativo e persistSession=true, THE SYSTEM SHALL confiar no SDK para renovar tokens (sem timers custom).

R4. Gating de RequireAuth
- User Story: Como utilizador, quero evitar flicker/redirects prematuros durante o arranque.
- WHILE authInitialized=false OU loading=true, THE SYSTEM SHALL apresentar um estado de carregamento (spinner/skeleton) nas rotas protegidas.
- IF authInitialized=true AND loading=false AND user=null, THEN THE SYSTEM SHALL redirecionar para /login.
- IF authInitialized=true AND user!=null, THEN THE SYSTEM SHALL renderizar os children sem redirect.

R5. Remoção de duplicação
- User Story: Como developer, quero eliminar ficheiros duplicados de AuthContext para evitar importações erradas.
- ON build/CI, THE SYSTEM SHALL não conter o ficheiro duplicado src/contexts/authcontext.tsx.

R6. Observabilidade controlada
- User Story: Como developer, quero poder ativar logs de auth em dev para diagnosticar problemas sem poluir a consola em prod.
- IF VITE_DEBUG_AUTH=true, THEN THE SYSTEM SHALL emitir logs detalhados (init, eventos, transições de estado) com prefixo [auth].
- IF VITE_DEBUG_AUTH!=true, THEN THE SYSTEM SHALL manter logs silenciosos (apenas erros relevantes).

R7. Sem alterações ao fluxo de login
- User Story: Como utilizador, após login por e-mail/password, quero ir para o dashboard.
- ON sucesso de login, THE SYSTEM SHALL navegar para /app (dashboard), mantendo o comportamento atual.
- WHEN refresh, THE SYSTEM SHALL apenas atualizar a página, mantendo a rota atual, sem redirects adicionais.

R8. Compatibilidade multi-tab (não prioritário mas suportado)
- WHEN o estado de sessão mudar noutra tab, THE SYSTEM SHALL refletir as alterações através do mecanismo do SDK (BroadcastChannel) sem duplicar subscrições.

Requisitos Não Funcionais
R9. Segurança
- IF for necessário registar erros de auth, THEN THE SYSTEM SHALL não incluir tokens/secrets nos logs.
- THE SYSTEM SHALL manter flowType='pkce', persistSession=true, autoRefreshToken=true no cliente Supabase.

R10. Performance e UX
- THE SYSTEM SHALL minimizar renders e evitar loops; o estado de auth deve estabilizar < 200ms no arranque em dev.
- THE SYSTEM SHALL evitar flicker visível nas rotas protegidas.

R11. Testabilidade
- THE SYSTEM SHALL expor estado (user, session, loading, authInitialized) no contexto para facilitar testes de integração.

Cantos e Edge Cases
- Sessão expirada durante refresh: getSession() null → RequireAuth redireciona após init.
- Erro transitório no getSession(): log de erro + retry opcional manual (fora de escopo).
- Password recovery: evento PASSWORD_RECOVERY não deve causar redirect automático.
- Logout: após signOut(), RequireAuth deve redirecionar para /login sem flicker.