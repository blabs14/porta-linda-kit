// Script de teste para verificar o salvamento do timesheet
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Carregar variáveis de ambiente do .env.local
function loadEnvVars() {
  try {
    const envContent = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Erro ao carregar .env.local:', error.message);
    return {};
  }
}

const envVars = loadEnvVars();
console.log('🔧 Variáveis carregadas:', Object.keys(envVars));

// Configuração do Supabase
const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔗 URL do Supabase:', supabaseUrl ? 'Configurada' : 'NÃO ENCONTRADA');
console.log('🔑 Chave do Supabase:', supabaseKey ? 'Configurada' : 'NÃO ENCONTRADA');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTimesheetSave() {
  console.log('🔍 Testando salvamento de timesheet...');
  
  try {
    // 1. Tentar login com utilizador de teste
    console.log('\n1. Tentando login com utilizador de teste...');
    
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'teste2@teste',
      password: 'teste14'
    });
    
    if (loginError) {
      console.error('❌ Erro de login:', loginError);
      return;
    }
    
    console.log('✅ Login realizado com sucesso');
    
    console.log('👤 Utilizador:', authData.user.email);
    console.log('🆔 User ID:', authData.user.id);
    
    // 2. Testar inserção de timesheet
    console.log('\n2. Testando inserção de entrada de timesheet...');
    
    const testEntry = {
      user_id: authData.user.id, // Usar o ID do utilizador autenticado
      contract_id: 'a54a8d87-2ed0-4f32-a21c-e0900a9afd29', // ID do contrato existente
      date: '2025-01-08',
      start_time: '09:00:00',
      end_time: '17:00:00',
      break_minutes: 60,
      description: 'Teste de inserção via script'
    };
    
    console.log('📝 Dados de teste:', testEntry);
    
    const { data: insertData, error: insertError } = await supabase
      .from('payroll_time_entries')
      .insert(testEntry)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro na inserção:', insertError);
      console.error('📋 Detalhes do erro:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
    } else {
      console.log('✅ Entrada inserida com sucesso:', insertData);
      
      // 3. Limpeza (opcional)
      console.log('\n3. Limpando dados de teste...');
      const { error: deleteError } = await supabase
        .from('payroll_time_entries')
        .delete()
        .eq('id', insertData.id);
      
      if (deleteError) {
        console.warn('⚠️ Erro ao limpar dados de teste:', deleteError);
      } else {
        console.log('✅ Dados de teste removidos');
      }
    }
    
    // 4. Logout
    console.log('\n4. Fazendo logout...');
    await supabase.auth.signOut();
    console.log('✅ Logout realizado');
    
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

// Executar teste
testTimesheetSave();