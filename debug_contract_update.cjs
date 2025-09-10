// Script de debug para testar a atualização do contrato
// Execute com: node debug_contract_update.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testContractUpdate() {
  try {
    console.log('🔍 Testing contract update...');
    
    // 1. Verificar se o contrato existe
    const { data: contract, error: fetchError } = await supabase
      .from('payroll_contracts')
      .select('*')
      .eq('id', '22222222-2222-2222-2222-222222222222')
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching contract:', fetchError);
      return;
    }
    
    console.log('✅ Contract found:', {
      id: contract.id,
      name: contract.name,
      currency: contract.currency,
      base_salary_cents: contract.base_salary_cents
    });
    
    // 2. Verificar moedas disponíveis
    const { data: currencies, error: currError } = await supabase
      .from('currencies')
      .select('*')
      .order('name', { ascending: true });
    
    if (currError) {
      console.error('❌ Error fetching currencies:', currError);
      return;
    }
    
    console.log('💰 Available currencies:', currencies.map(c => c.code));
    
    // 3. Simular validação de moeda
    const formData = {
      name: contract.name,
      base_salary_cents: contract.base_salary_cents,
      weekly_hours: contract.weekly_hours || 40,
      currency: contract.currency,
      is_active: contract.is_active
    };
    
    const isValidISO = /^[A-Z]{3}$/.test(formData.currency || '');
    const currencyOptions = currencies.map(c => ({ code: c.code, name: c.name }));
    const inList = currencyOptions.length === 0 ? true : currencyOptions.some(c => c.code === formData.currency);
    
    console.log('🔍 Currency validation:', {
      currency: formData.currency,
      isValidISO,
      currencyOptionsLength: currencyOptions.length,
      currencyOptions: currencyOptions.map(c => c.code),
      inList
    });
    
    if (!isValidISO || !inList) {
      console.log('❌ Currency validation failed!');
      return;
    }
    
    // 4. Tentar atualizar o contrato
    const { data: updated, error: updateError } = await supabase
      .from('payroll_contracts')
      .update({
        name: formData.name,
        base_salary_cents: formData.base_salary_cents,
        weekly_hours: formData.weekly_hours,
        currency: formData.currency,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', contract.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating contract:', updateError);
      return;
    }
    
    console.log('✅ Contract updated successfully:', {
      id: updated.id,
      name: updated.name,
      currency: updated.currency
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testContractUpdate();