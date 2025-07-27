import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Executar SQL diretamente para criar a tabela budgets
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Criar tabela budgets
        CREATE TABLE IF NOT EXISTS public.budgets (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          categoria_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
          valor DECIMAL(15, 2) NOT NULL CHECK (valor > 0),
          mes VARCHAR(7) NOT NULL CHECK (mes ~ '^\d{4}-\d{2}$'),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Criar índices
        CREATE INDEX IF NOT EXISTS budgets_user_id_idx ON public.budgets(user_id);
        CREATE INDEX IF NOT EXISTS budgets_categoria_id_idx ON public.budgets(categoria_id);
        CREATE INDEX IF NOT EXISTS budgets_mes_idx ON public.budgets(mes);
        CREATE INDEX IF NOT EXISTS budgets_user_mes_idx ON public.budgets(user_id, mes);

        -- Habilitar RLS
        ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

        -- Criar políticas RLS
        DROP POLICY IF EXISTS budgets_select_own ON public.budgets;
        DROP POLICY IF EXISTS budgets_insert_own ON public.budgets;
        DROP POLICY IF EXISTS budgets_update_own ON public.budgets;
        DROP POLICY IF EXISTS budgets_delete_own ON public.budgets;
        
        CREATE POLICY budgets_select_own ON public.budgets
          FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY budgets_insert_own ON public.budgets
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY budgets_update_own ON public.budgets
          FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY budgets_delete_own ON public.budgets
          FOR DELETE USING (auth.uid() = user_id);
      `
    })

    if (error) {
      console.error('Erro ao criar tabela:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar tabela budgets', 
          details: error,
          message: 'A função exec_sql não existe. Precisas de criar a tabela manualmente no Supabase Dashboard.'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Tabela budgets criada com sucesso no Supabase remoto!',
        data: data
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message,
        message: 'Não foi possível criar a tabela automaticamente. Precisas de criar manualmente no Supabase Dashboard.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 