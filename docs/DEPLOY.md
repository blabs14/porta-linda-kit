# Guia de Deploy

## Variáveis de Ambiente
Defina no ambiente de produção:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Opcional (Node scripts):
- SUPABASE_URL (fallback)
- SUPABASE_ANON_KEY (fallback)

## Preparação
1. Verificar migrações alinhadas com o remoto:
   - `supabase db lint`
   - `supabase migration list --linked`
2. Gerar tipos após mudanças no schema:
   - `npx supabase gen types --lang=typescript --project-id <project-ref> > src/integrations/supabase/database.types.ts`

## Build
- `npm ci`
- `npm run test:run`
- `npm run build`

## Deploy (estático)
- Servir o conteúdo de `dist/` num CDN/host estático.
- Garantir que as variáveis `VITE_...` foram embebidas no build conforme o ambiente.

## PWA
- Gera `dist/sw.js` automaticamente. Se alterar rotas/URLs externas, rever `vite.config.ts` (Workbox runtimeCaching) — já utiliza padrão dinâmico a partir de `VITE_SUPABASE_URL`.

## Validações pós-deploy
- Login/registo funcionais.
- Listagem de contas, transações, metas.
- Operações de criação/edição/remoção.
- Network: chamadas a `supabase.co` com 200s/2xx.

## Notas de Segurança
- Nunca commit de `.env*` (repo já ignora e inclui `.env.example`).
- Revisar CORS e Redirect URLs no painel Supabase.
- Usar `anon` key apenas no frontend; nunca expor service_role. 