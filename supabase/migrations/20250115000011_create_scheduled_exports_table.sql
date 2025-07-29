-- Criar tabela para exportações agendadas
CREATE TABLE IF NOT EXISTS scheduled_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  schedule VARCHAR(20) NOT NULL CHECK (schedule IN ('daily', 'weekly', 'monthly')),
  time TIME NOT NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  options JSONB NOT NULL,
  email VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_user_id ON scheduled_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_active ON scheduled_exports(active);
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_next_run ON scheduled_exports(next_run);

-- RLS
ALTER TABLE scheduled_exports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own scheduled exports" ON scheduled_exports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled exports" ON scheduled_exports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled exports" ON scheduled_exports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled exports" ON scheduled_exports
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_scheduled_exports_updated_at
  BEFORE UPDATE ON scheduled_exports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 