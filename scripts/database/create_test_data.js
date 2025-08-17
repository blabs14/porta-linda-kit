import { createClient } from '@supabase/supabase-js';

// Carregar .env.local/.env em runtime (ESM-friendly)
try {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config({ path: '.env' });
} catch {
  // ignorar
}

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente antes de correr este script.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  console.log('🔧 Criando dados de teste...');
  
  try {
    // 1. Criar um perfil de teste
    console.log('👤 Criando perfil de teste...');
    
    const testProfile = {
      id: '550e8400-e29b-41d4-a716-446655440000', // UUID fixo para teste
      nome: 'João Silva',
      foto_url: null,
      telefone: '+351 912 345 678',
      data_nascimento: '1990-01-01',
      morada: 'Rua das Flores, 123',
      cidade: 'Lisboa',
      codigo_postal: '1000-001',
      pais: 'Portugal',
      moeda_preferida: 'EUR',
      timezone: 'Europe/Lisbon',
      configuracoes: {
        notificacoes_email: true,
        notificacoes_push: true,
        tema: 'light'
      }
    };
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert(testProfile, { onConflict: 'id' })
      .select()
      .single();
    
    if (profileError) {
      console.error('❌ Erro ao criar perfil:', profileError);
      return;
    }
    
    console.log('✅ Perfil criado:', profileData);
    
    // 2. Criar uma família de teste
    console.log('👥 Criando família de teste...');
    
    const testFamily = {
      id: '550e8400-e29b-41d4-a716-446655440001', // UUID fixo para teste
      nome: 'Família Silva',
      description: 'Família de teste para desenvolvimento',
      created_by: testProfile.id,
      settings: {
        partilha_automatica: true,
        notificacoes_familia: true
      }
    };
    
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .upsert(testFamily, { onConflict: 'id' })
      .select()
      .single();
    
    if (familyError) {
      console.error('❌ Erro ao criar família:', familyError);
      return;
    }
    
    console.log('✅ Família criada:', familyData);
    
    // 3. Adicionar o utilizador como membro da família
    console.log('👤 Adicionando utilizador como membro da família...');
    
    const testMember = {
      id: '550e8400-e29b-41d4-a716-446655440002', // UUID fixo para teste
      family_id: familyData.id,
      user_id: testProfile.id,
      role: 'admin',
      status: 'active'
    };
    
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .upsert(testMember, { onConflict: 'id' })
      .select()
      .single();
    
    if (memberError) {
      console.error('❌ Erro ao criar membro:', memberError);
      return;
    }
    
    console.log('✅ Membro criado:', memberData);
    
    // 4. Criar um convite de teste
    console.log('📧 Criando convite de teste...');
    
    const testInvite = {
      id: '550e8400-e29b-41d4-a716-446655440003', // UUID fixo para teste
      family_id: familyData.id,
      email: 'maria@example.com',
      role: 'member',
      status: 'pending',
      invited_by: testProfile.id
    };
    
    const { data: inviteData, error: inviteError } = await supabase
      .from('family_invites')
      .upsert(testInvite, { onConflict: 'id' })
      .select()
      .single();
    
    if (inviteError) {
      console.error('❌ Erro ao criar convite:', inviteError);
      return;
    }
    
    console.log('✅ Convite criado:', inviteData);
    
    console.log('🎉 Dados de teste criados com sucesso!');
    console.log('📋 Resumo:');
    console.log(`   - Perfil: ${profileData.nome} (${profileData.id})`);
    console.log(`   - Família: ${familyData.nome} (${familyData.id})`);
    console.log(`   - Membro: ${memberData.role} (${memberData.id})`);
    console.log(`   - Convite: ${inviteData.email} (${inviteData.id})`);
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

// Executar a criação de dados
createTestData(); 