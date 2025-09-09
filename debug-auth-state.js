import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAuthState() {
  console.log('🔍 Debug: Estado de autenticação');
  console.log('==================================================');
  
  try {
    // 1. Verificar sessão atual
    console.log('\n1. Verificando sessão atual...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Erro ao obter sessão:', sessionError.message);
      return;
    }
    
    if (sessionData.session) {
      console.log('✅ Sessão ativa encontrada:');
      console.log(`   - User ID: ${sessionData.session.user.id}`);
      console.log(`   - Email: ${sessionData.session.user.email}`);
      console.log(`   - Expira em: ${new Date(sessionData.session.expires_at * 1000).toISOString()}`);
      
      // 2. Testar acesso aos contratos com utilizador autenticado
      console.log('\n2. Testando acesso aos contratos com utilizador autenticado...');
      const { data: contracts, error: contractsError } = await supabase
        .from('payroll_contracts')
        .select('*')
        .eq('user_id', sessionData.session.user.id);
      
      if (contractsError) {
        console.log('❌ Erro ao buscar contratos:', contractsError.message);
      } else {
        console.log(`✅ Contratos encontrados: ${contracts?.length || 0}`);
        contracts?.forEach((contract, index) => {
          console.log(`   Contrato ${index + 1}: ${contract.contract_name} (${contract.is_active ? 'Ativo' : 'Inativo'})`);
        });
      }
    } else {
      console.log('❌ Nenhuma sessão ativa encontrada');
      
      // 3. Tentar fazer login com teste2@teste
      console.log('\n3. Tentando fazer login com teste2@teste...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'teste2@teste',
        password: 'teste123' // Assumindo esta password
      });
      
      if (loginError) {
        console.log('❌ Erro no login:', loginError.message);
        console.log('   Tentando com outras passwords...');
        
        const passwords = ['teste14', 'teste', 'password', '123456', 'admin'];
        for (const pwd of passwords) {
          console.log(`   Tentando password: ${pwd}`);
          const { data: tryLogin, error: tryError } = await supabase.auth.signInWithPassword({
            email: 'teste2@teste',
            password: pwd
          });
          
          if (!tryError && tryLogin.session) {
            console.log(`✅ Login bem-sucedido com password: ${pwd}`);
            console.log(`   User ID: ${tryLogin.session.user.id}`);
            
            // Testar contratos após login
            const { data: contractsAfterLogin, error: contractsAfterLoginError } = await supabase
              .from('payroll_contracts')
              .select('*')
              .eq('user_id', tryLogin.session.user.id);
            
            if (contractsAfterLoginError) {
              console.log('❌ Erro ao buscar contratos após login:', contractsAfterLoginError.message);
            } else {
              console.log(`✅ Contratos após login: ${contractsAfterLogin?.length || 0}`);
            }
            break;
          }
        }
      } else if (loginData.session) {
        console.log('✅ Login bem-sucedido');
        console.log(`   User ID: ${loginData.session.user.id}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
  
  console.log('\n🏁 Debug concluído');
}

debugAuthState();