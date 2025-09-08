# Auth Refresh Hardening — Tasks

Esforço total (estimativa): ~3–5h
Dependências: Supabase JS v2 já configurado; Vite; React Router já existente.
Riscos: Duplicação de ficheiros; múltiplas subscrições; regressão em rotas protegidas.

Checklist por Fases

Fase 1 — Contexto
1. Adicionar estado authInitialized ao AuthContext
   - Reqs: R1, R2, R11
   - Est.: 45m
2. Garantir bootstrap determinístico (getSession inicial + set loading=false no finally)
   - Reqs: R1, R10
   - Est.: 30m
3. Consolidar onAuthStateChange com tratamento de eventos e cleanup
   - Reqs: R2, R3
   - Est.: 30m
4. Adicionar logs condicionais por VITE_DEBUG_AUTH
   - Reqs: R6, R9
   - Est.: 15m

Fase 2 — Gating
5. Atualizar RequireAuth para usar authInitialized + loading
   - Reqs: R4
   - Est.: 30m
6. Ajustar spinner/skeleton (sem impacto visual relevante)
   - Reqs: R10
   - Est.: 15m

Fase 3 — Higiene e Observabilidade
7. Remover src/contexts/authcontext.tsx (duplicado)
   - Reqs: R5
   - Est.: 5m
8. Verificar que não existem imports para o duplicado
   - Reqs: R5
   - Est.: 10m

Fase 4 — Smoke Tests manuais (dev)
9. Confirmar refresh em /app não redireciona para /login
   - Reqs: R1, R4
   - Est.: 10m
10. Confirmar sessão inexistente redireciona após init
   - Reqs: R4
   - Est.: 10m
11. Confirmar TOKEN_REFRESHED mantém user
   - Reqs: R3
   - Est.: 10m
12. Confirmar logout redireciona sem flicker
   - Reqs: R4, R7
   - Est.: 10m

Qualidade (checklist)
- A11y: spinner com aria-busy/role status
- Mobile: sem alterações
- Cross-browser: verificar Chrome/Edge
- Performance: sem flicker visível
- Segurança: sem tokens em logs; manter PKCE
- Code review: diffs pequenos e focados