-- Migração: Tornar campo prazo opcional na tabela goals
-- Data: 2025-01-15

-- Tornar o campo prazo opcional na tabela goals
ALTER TABLE public.goals
  ALTER COLUMN prazo DROP NOT NULL;

-- Fim da migração 