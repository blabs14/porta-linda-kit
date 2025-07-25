-- Criação da tabela de audit trail
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  operation text NOT NULL,
  table_name text NOT NULL,
  row_id uuid,
  old_data jsonb,
  new_data jsonb,
  details jsonb,
  ip_address text
);

-- Ativar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: apenas admins podem consultar
CREATE POLICY "Admins only" ON public.audit_logs
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')); 