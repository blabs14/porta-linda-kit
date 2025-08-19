#!/usr/bin/env node

// Script para verificar se o trigger de funding de objetivos está implementado na produção
// Este script verifica:
// 1. Se existem regras de funding ativas
// 2. Se existem contribuições recentes
// 3. Se a tabela goal_funding_rules existe
// 4. Se a tabela goal_contributions existe

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkGoalFundingImplementation() {
  console.log('🔍 Verificando implementação do sistema de funding de objetivos na produção...');
  console.log(`📍 Base de dados: ${supabaseUrl}`);
  console.log('');

  try {
    // 1. Verificar se a tabela goal_funding_rules existe
    console.log('1. Verificando tabela goal_funding_rules...');
    const { data: rules, error: rulesError } = await supabase
      .from('goal_funding_rules')
      .select('*')
      .limit(1);

    if (rulesError) {
      console.error('❌ Tabela goal_funding_rules não encontrada:', rulesError.message);
    } else {
      console.log('✅ Tabela goal_funding_rules existe');
    }

    // 2. Verificar se a tabela goal_contributions existe
    console.log('\n2. Verificando tabela goal_contributions...');
    const { data: contributions, error: contribError } = await supabase
      .from('goal_contributions')
      .select('*')
      .limit(1);

    if (contribError) {
      console.error('❌ Tabela goal_contributions não encontrada:', contribError.message);
    } else {
      console.log('✅ Tabela goal_contributions existe');
    }

    // 3. Verificar regras de funding ativas
     let activeRules = null;
     let activeRulesError = null;
     if (!rulesError) {
       console.log('\n3. Verificando regras de funding ativas...');
       const result = await supabase
         .from('goal_funding_rules')
         .select('*')
         .eq('enabled', true);
       
       activeRules = result.data;
       activeRulesError = result.error;

       if (activeRulesError) {
         console.error('❌ Erro ao verificar regras ativas:', activeRulesError.message);
       } else {
         console.log(`📊 Regras de funding ativas: ${activeRules?.length || 0}`);
         if (activeRules && activeRules.length > 0) {
           activeRules.forEach(rule => {
             console.log(`   - ${rule.type} (Goal ID: ${rule.goal_id}, Currency: ${rule.currency})`);
             if (rule.type === 'income_percent') {
               console.log(`     Percentagem: ${(rule.percent_bp / 100).toFixed(2)}%`);
             }
             if (rule.type === 'fixed_monthly') {
               console.log(`     Valor fixo: €${(rule.fixed_cents / 100).toFixed(2)}`);
             }
           });
         }
       }
     }

    // 4. Verificar contribuições recentes
     let recentContribs = null;
     let recentError = null;
     if (!contribError) {
       console.log('\n4. Verificando contribuições recentes...');
       const result = await supabase
         .from('goal_contributions')
         .select('*')
         .order('created_at', { ascending: false })
         .limit(10);
       
       recentContribs = result.data;
       recentError = result.error;

       if (recentError) {
         console.error('❌ Erro ao verificar contribuições:', recentError.message);
       } else {
         console.log(`📈 Contribuições recentes: ${recentContribs?.length || 0}`);
         if (recentContribs && recentContribs.length > 0) {
           recentContribs.forEach(contrib => {
             const date = new Date(contrib.created_at).toLocaleDateString('pt-PT');
             console.log(`   - ${contrib.description}: €${(contrib.amount_cents / 100).toFixed(2)} (${date})`);
           });
         }
       }
     }

    // 5. Verificar se existem objetivos
     console.log('\n5. Verificando objetivos existentes...');
     const { data: goals, error: goalsError } = await supabase
       .from('goals')
       .select('id, nome, valor_objetivo, valor_atual, ativa')
       .limit(5);

    if (goalsError) {
      console.error('❌ Erro ao verificar objetivos:', goalsError.message);
    } else {
      console.log(`🎯 Objetivos encontrados: ${goals?.length || 0}`);
      if (goals && goals.length > 0) {
        goals.forEach(goal => {
           console.log(`   - ${goal.nome}: ${goal.valor_atual}/${goal.valor_objetivo} (${goal.ativa ? 'ativo' : 'inativo'})`);
         });
      }
    }

    // 6. Verificar transações recentes com tipo 'transferencia'
    console.log('\n6. Verificando transações de transferência recentes...');
    const { data: transfers, error: transfersError } = await supabase
      .from('transactions')
      .select('id, tipo, valor, descricao, data')
      .eq('tipo', 'transferencia')
      .order('data', { ascending: false })
      .limit(5);

    if (transfersError) {
      console.error('❌ Erro ao verificar transferências:', transfersError.message);
    } else {
      console.log(`💸 Transferências recentes: ${transfers?.length || 0}`);
      if (transfers && transfers.length > 0) {
        transfers.forEach(transfer => {
          const date = new Date(transfer.data).toLocaleDateString('pt-PT');
          console.log(`   - ${transfer.descricao}: €${transfer.valor} (${date})`);
        });
      }
    }

    // 7. Verificar se existem contribuições associadas a transferências (não deveria haver)
    let transferContribs = null;
    if (!contribError && transfers && transfers.length > 0) {
      console.log('\n7. Verificando se transferências geraram contribuições (não deveria haver)...');
      const transferIds = transfers.map(t => t.id);
      
      const { data: transferContribsData, error: transferContribsError } = await supabase
        .from('goal_contributions')
        .select('*')
        .in('transaction_id', transferIds);

      transferContribs = transferContribsData;
      if (transferContribsError) {
        console.error('❌ Erro ao verificar contribuições de transferências:', transferContribsError.message);
      } else {
        if (transferContribs && transferContribs.length > 0) {
          console.log(`⚠️  ATENÇÃO: Encontradas ${transferContribs.length} contribuições geradas por transferências!`);
          transferContribs.forEach(contrib => {
            console.log(`   - Transação ${contrib.transaction_id}: €${(contrib.amount_cents / 100).toFixed(2)}`);
          });
        } else {
          console.log('✅ Nenhuma contribuição gerada por transferências (correto)');
        }
      }
    }

    console.log('\n✅ Verificação concluída!');
    console.log('\n📋 Resumo:');
    console.log(`   • Tabela goal_funding_rules: ${rulesError ? 'NÃO EXISTE' : 'EXISTE'}`);
    console.log(`   • Tabela goal_contributions: ${contribError ? 'NÃO EXISTE' : 'EXISTE'}`);
    console.log(`   • Regras ativas: ${!rulesError && activeRules ? activeRules.length : 'N/A'}`);
    console.log(`   • Contribuições recentes: ${!contribError && recentContribs ? recentContribs.length : 'N/A'}`);
    console.log(`   • Objetivos: ${!goalsError && goals ? goals.length : 'N/A'}`);
    console.log(`   • Transferências recentes: ${!transfersError && transfers ? transfers.length : 'N/A'}`);
    
    if (!contribError && !transfersError && transfers && transfers.length > 0) {
      console.log(`   • Contribuições de transferências: ${transferContribs ? transferContribs.length : 'N/A'} (deveria ser 0)`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

if (require.main === module) {
  checkGoalFundingImplementation()
    .then(() => {
      console.log('\n🏁 Script concluído');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { checkGoalFundingImplementation };