console.log('🔍 Testando criação de objetivo...');

// Simular os dados que seriam enviados
const testGoal = {
  nome: 'Teste Debug',
  valor_objetivo: 1000,
  prazo: '2025-12-31'
};

console.log('Dados do objetivo:', testGoal);

// Simular validação Zod
const goalSchema = {
  nome: 'string',
  valor_objetivo: 'number',
  prazo: 'string'
};

console.log('Schema de validação:', goalSchema);

// Verificar se os dados são válidos
const isValid = 
  typeof testGoal.nome === 'string' && 
  testGoal.nome.length > 0 &&
  typeof testGoal.valor_objetivo === 'number' && 
  testGoal.valor_objetivo > 0 &&
  typeof testGoal.prazo === 'string' && 
  testGoal.prazo.length > 0;

console.log('Dados válidos:', isValid);

if (isValid) {
  console.log('✅ Dados prontos para envio');
} else {
  console.log('❌ Dados inválidos');
} 