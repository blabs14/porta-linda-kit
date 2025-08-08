-- Script para inserir dados de teste

-- Criar um utilizador de teste se não existir
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'test@example.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{}', '{}', false, 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Criar perfil para o utilizador de teste
INSERT INTO public.profiles (id, username, full_name)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'testuser', 'Test User')
ON CONFLICT (id) DO NOTHING;

-- Inserir contas de teste
INSERT INTO public.accounts (id, nome, tipo, saldo, user_id, created_at)
VALUES 
  (gen_random_uuid(), 'Conta Corrente Principal', 'conta corrente', 1500.00, '11111111-1111-1111-1111-111111111111', NOW()),
  (gen_random_uuid(), 'Conta Poupança', 'conta poupança', 5000.00, '11111111-1111-1111-1111-111111111111', NOW()),
  (gen_random_uuid(), 'Cartão de Crédito Visa', 'cartão de crédito', -250.00, '11111111-1111-1111-1111-111111111111', NOW())
ON CONFLICT (id) DO NOTHING;

-- Inserir algumas categorias de teste
INSERT INTO public.categories (id, nome, cor, user_id, created_at)
VALUES 
  (gen_random_uuid(), 'Alimentação', '#FF6B6B', '11111111-1111-1111-1111-111111111111', NOW()),
  (gen_random_uuid(), 'Transporte', '#4ECDC4', '11111111-1111-1111-1111-111111111111', NOW()),
  (gen_random_uuid(), 'Entretenimento', '#45B7D1', '11111111-1111-1111-1111-111111111111', NOW())
ON CONFLICT (id) DO NOTHING;