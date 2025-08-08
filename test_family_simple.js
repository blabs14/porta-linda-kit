import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente antes de correr este script.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFamilySimple() {
  console.log('🔍 Teste simples da funcionalidade de família...');
  
  try {
    // 1. Verificar se há utilizadores na base de dados
    console.log('📊 Verificando utilizadores na base de dados...');
    
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, nome')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Erro ao obter utilizadores:', usersError);
      return;
    }
    
    console.log('✅ Utilizadores encontrados:', users?.length || 0);
    if (users && users.length > 0) {
      console.log('📋 Primeiro utilizador:', users[0]);
    }
    
    // 2. Verificar se há famílias na base de dados
    console.log('👥 Verificando famílias na base de dados...');
    
    const { data: families, error: familiesError } = await supabase
      .from('families')
      .select('id, nome, description, created_at')
      .limit(5);
    
    if (familiesError) {
      console.error('❌ Erro ao obter famílias:', familiesError);
      return;
    }
    
    console.log('✅ Famílias encontradas:', families?.length || 0);
    if (families && families.length > 0) {
      console.log('📋 Primeira família:', families[0]);
    }
    
    // 3. Verificar se há membros de família
    console.log('👤 Verificando membros de família...');
    
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select(`
        id,
        family_id,
        user_id,
        role,
        joined_at,
        families!inner(nome),
        profiles!inner(nome)
      `)
      .limit(5);
    
    if (membersError) {
      console.error('❌ Erro ao obter membros:', membersError);
      return;
    }
    
    console.log('✅ Membros de família encontrados:', members?.length || 0);
    if (members && members.length > 0) {
      console.log('📋 Primeiro membro:', members[0]);
    }
    
    // 4. Testar a função RPC diretamente (sem autenticação)
    console.log('🔧 Testando função RPC get_user_family_data...');
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_family_data');
    
    if (rpcError) {
      console.error('❌ Erro na função RPC:', rpcError);
    } else {
      console.log('✅ Função RPC executada com sucesso');
      console.log('📊 Dados retornados:', rpcData);
    }
    
    // 5. Verificar estrutura das tabelas
    console.log('🏗️ Verificando estrutura das tabelas...');
    
    const tables = ['families', 'family_members', 'family_invites', 'profiles'];
    
    for (const table of tables) {
      const { data: columns, error: columnsError } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (columnsError) {
        console.error(`❌ Erro ao verificar tabela ${table}:`, columnsError);
      } else {
        console.log(`✅ Tabela ${table} está acessível`);
      }
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

// Executar o teste
testFamilySimple(); 