import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente antes de correr este script.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFamilyRPCFixed() {
  console.log('🔧 Testando função RPC após correções...');
  
  try {
    // 1. Verificar se há famílias na base de dados
    console.log('👥 Verificando famílias...');
    
    const { data: families, error: familiesError } = await supabase
      .from('families')
      .select('id, nome, description')
      .limit(5);
    
    if (familiesError) {
      console.error('❌ Erro ao obter famílias:', familiesError);
    } else {
      console.log('✅ Famílias encontradas:', families?.length || 0);
      if (families && families.length > 0) {
        families.forEach((family, index) => {
          console.log(`   ${index + 1}. ${family.nome} (${family.id})`);
        });
      }
    }
    
    // 2. Verificar membros de família
    console.log('👤 Verificando membros de família...');
    
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select(`
        id,
        user_id,
        family_id,
        role,
        joined_at,
        families(nome),
        profiles(nome)
      `)
      .limit(5);
    
    if (membersError) {
      console.error('❌ Erro ao obter membros:', membersError);
    } else {
      console.log('✅ Membros encontrados:', members?.length || 0);
      if (members && members.length > 0) {
        members.forEach((member, index) => {
          const profileName = member.profiles?.nome || 'Sem nome';
          const familyName = member.families?.nome || 'Sem família';
          console.log(`   ${index + 1}. ${profileName} - ${member.role} em ${familyName}`);
        });
      }
    }
    
    // 3. Testar a função RPC (sem autenticação - deve retornar null)
    console.log('🔧 Testando função RPC get_user_family_data...');
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_family_data');
    
    if (rpcError) {
      console.error('❌ Erro na função RPC:', rpcError);
    } else {
      console.log('✅ Função RPC executada com sucesso');
      console.log('📊 Dados retornados:', rpcData);
      
      if (rpcData === null) {
        console.log('💡 Retorna null porque não há utilizador autenticado (comportamento esperado)');
      }
    }
    
    // 4. Verificar se as políticas RLS estão a funcionar
    console.log('🔒 Verificando políticas RLS...');
    
    // Tentar aceder a dados sem autenticação (deve falhar devido a RLS)
    const { data: rlsTest, error: rlsError } = await supabase
      .from('family_members')
      .select('*')
      .limit(1);
    
    if (rlsError) {
      console.log('✅ Políticas RLS estão a funcionar (bloqueiam acesso sem autenticação)');
    } else {
      console.log('⚠️ Políticas RLS podem não estar a funcionar corretamente');
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

// Executar o teste
testFamilyRPCFixed(); 