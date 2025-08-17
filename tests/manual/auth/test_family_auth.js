import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente antes de correr este script.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_EMAIL = process.env.TEST_EMAIL || 'teste2@teste';
const TEST_PASSWORDS = (process.env.TEST_PASSWORDS || 'teste14,teste123,teste,password,123456,admin')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function testFamilyAuth() {
  console.log('🔍 Testando autenticação e função RPC...');
  
  try {
    // 1. Tentar fazer login com TEST_EMAIL e lista de passwords
    console.log('🔐 Tentando fazer login...');
    let authData = null;

    for (const password of TEST_PASSWORDS) {
      console.log(`🔐 Tentando password: ${password}`);
      const result = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password
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