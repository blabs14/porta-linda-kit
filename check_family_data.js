import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ebitcwrrcumsvqjgrapw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaXRjd3JyY3Vtc3ZxamdyYXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NjcyMTYsImV4cCI6MjA2ODM0MzIxNn0.hLlTeSD2VzVCjvUSXLYQypXNYqthDx0q1N86aOftfEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFamilyData() {
  console.log('🔍 Verificando dados das famílias...');
  
  try {
    // 1. Verificar todas as famílias (sem RLS)
    console.log('👥 Verificando todas as famílias...');
    
    const { data: allFamilies, error: allFamiliesError } = await supabase
      .from('families')
      .select('*');
    
    if (allFamiliesError) {
      console.error('❌ Erro ao obter todas as famílias:', allFamiliesError);
    } else {
      console.log('✅ Todas as famílias:', allFamilies?.length || 0);
      if (allFamilies && allFamilies.length > 0) {
        allFamilies.forEach((family, index) => {
          console.log(`   ${index + 1}. ${family.nome} (${family.id})`);
        });
      }
    }
    
    // 2. Verificar membros de família
    console.log('👤 Verificando membros de família...');
    
    const { data: allMembers, error: allMembersError } = await supabase
      .from('family_members')
      .select(`
        *,
        families!inner(nome),
        profiles!inner(nome)
      `);
    
    if (allMembersError) {
      console.error('❌ Erro ao obter membros:', allMembersError);
    } else {
      console.log('✅ Todos os membros:', allMembers?.length || 0);
      if (allMembers && allMembers.length > 0) {
        allMembers.forEach((member, index) => {
          console.log(`   ${index + 1}. ${member.profiles.nome} - ${member.role} em ${member.families.nome}`);
        });
      }
    }
    
    // 3. Verificar convites
    console.log('📧 Verificando convites...');
    
    const { data: allInvites, error: allInvitesError } = await supabase
      .from('family_invites')
      .select(`
        *,
        families!inner(nome)
      `);
    
    if (allInvitesError) {
      console.error('❌ Erro ao obter convites:', allInvitesError);
    } else {
      console.log('✅ Todos os convites:', allInvites?.length || 0);
      if (allInvites && allInvites.length > 0) {
        allInvites.forEach((invite, index) => {
          console.log(`   ${index + 1}. ${invite.email} - ${invite.status} para ${invite.families.nome}`);
        });
      }
    }
    
    // 4. Verificar perfis
    console.log('👤 Verificando perfis...');
    
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (allProfilesError) {
      console.error('❌ Erro ao obter perfis:', allProfilesError);
    } else {
      console.log('✅ Todos os perfis:', allProfiles?.length || 0);
      if (allProfiles && allProfiles.length > 0) {
        allProfiles.forEach((profile, index) => {
          console.log(`   ${index + 1}. ${profile.nome} (${profile.id})`);
        });
      }
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

// Executar a verificação
checkFamilyData(); 