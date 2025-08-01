import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ebitcwrrcumsvqjgrapw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaXRjd3JyY3Vtc3ZxamdyYXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NjcyMTYsImV4cCI6MjA2ODM0MzIxNn0.hLlTeSD2VzVCjvUSXLYQypXNYqthDx0q1N86aOftfEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFamilyAuth() {
  console.log('🔍 Testando autenticação e função RPC...');
  
  try {
    // 1. Tentar fazer login com teste2@teste
    console.log('🔐 Tentando fazer login...');
    // Tentar diferentes passwords
    const passwords = ['teste14', 'teste123', 'teste', 'password', '123456', 'admin'];
    let authData = null;
    let authError = null;

    for (const password of passwords) {
      console.log(`🔐 Tentando password: ${password}`);
      const result = await supabase.auth.signInWithPassword({
        email: 'teste2@teste',
        password: password
      });
      
      if (!result.error) {
        authData = result.data;
        console.log(`✅ Login bem-sucedido com password: ${password}`);
        break;
      } else {
        console.log(`❌ Password ${password} falhou:`, result.error.message);
      }
    }

    if (!authData) {
      console.error('❌ Todas as passwords falharam');
      return;
    }

    if (authError) {
      console.error('❌ Erro no login:', authError);
      return;
    }

    if (!authData.user) {
      console.error('❌ Login falhou - nenhum utilizador retornado');
      return;
    }

    console.log('✅ Login bem-sucedido:', authData.user.email);
    console.log('🆔 User ID:', authData.user.id);

    // 2. Verificar se o utilizador tem perfil
    console.log('👤 Verificando perfil do utilizador...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Erro ao obter perfil:', profileError);
    } else {
      console.log('✅ Perfil encontrado:', profile);
    }

    // 3. Verificar famílias do utilizador
    console.log('👥 Verificando famílias do utilizador...');
    const { data: userFamilies, error: familiesError } = await supabase
      .from('family_members')
      .select(`
        family_id,
        role,
        families(nome)
      `)
      .eq('user_id', authData.user.id);

    if (familiesError) {
      console.error('❌ Erro ao obter famílias:', familiesError);
    } else {
      console.log('✅ Famílias do utilizador:', userFamilies);
      
      if (userFamilies && userFamilies.length > 0) {
        const familyId = userFamilies[0].family_id;
        console.log('🏠 Testando com família:', familyId);

        // 4. Testar função RPC
        console.log('🔧 Testando função RPC get_family_members_with_profiles...');
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_family_members_with_profiles', {
          p_family_id: familyId
        });

        if (rpcError) {
          console.error('❌ Erro na função RPC:', rpcError);
        } else {
          console.log('✅ Função RPC executada com sucesso');
          console.log('📊 Dados retornados:', rpcData);
          
          if (Array.isArray(rpcData)) {
            console.log('👥 Número de membros:', rpcData.length);
            rpcData.forEach((member, index) => {
              console.log(`   ${index + 1}. ${member.profile?.nome || 'Sem nome'} - ${member.role}`);
            });
          }
        }
      }
    }

    // 5. Testar função get_user_family_data
    console.log('🔧 Testando função get_user_family_data...');
    const { data: familyData, error: familyDataError } = await supabase.rpc('get_user_family_data');

    if (familyDataError) {
      console.error('❌ Erro na função get_user_family_data:', familyDataError);
    } else {
      console.log('✅ Função get_user_family_data executada com sucesso');
      console.log('📊 Dados retornados:', familyData);
    }

  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

// Executar o teste
testFamilyAuth(); 