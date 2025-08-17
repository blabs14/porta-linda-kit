// Simular o comportamento do formulário de objetivos
console.log('🔍 Testando comportamento do formulário...');

// Simular dados do formulário
const formData = {
  nome: 'Teste Objetivo',
  valor_objetivo: '1000',
  prazo: '2025-12-31'
};

console.log('Dados do formulário:', formData);

// Simular validação Zod
const goalSchema = {
  nome: 'string',
  valor_objetivo: 'number',
  prazo: 'string'
};

// Simular validação
const validateForm = () => {
  const errors = {};
  
  if (!formData.nome || formData.nome.trim().length === 0) {
    errors.nome = 'Nome obrigatório';
  }
  
  if (!formData.valor_objetivo || parseFloat(formData.valor_objetivo) <= 0) {
    errors.valor_objetivo = 'Valor objetivo inválido';
  }
  
  if (!formData.prazo || formData.prazo.trim().length === 0) {
    errors.prazo = 'Prazo obrigatório';
  }
  
  return Object.keys(errors).length === 0;
};

// Simular preparação do payload
const preparePayload = () => {
  return {
    nome: formData.nome,
    valor_objetivo: Number(formData.valor_objetivo),
    prazo: formData.prazo
  };
};

// Testar validação
console.log('Testando validação...');
const isValid = validateForm();
console.log('Formulário válido:', isValid);

if (isValid) {
  console.log('Preparando payload...');
  const payload = preparePayload();
  console.log('Payload preparado:', payload);
  console.log('✅ Pronto para envio');
} else {
  console.log('❌ Formulário inválido');
}

// Simular diferentes cenários
console.log('\n--- Testando cenários ---');

// Cenário 1: Dados válidos
console.log('\nCenário 1: Dados válidos');
const validForm = {
  nome: 'Viagem à Europa',
  valor_objetivo: '5000',
  prazo: '2025-12-31'
};
console.log('Resultado:', validateForm.call({ formData: validForm }));

// Cenário 2: Nome vazio
console.log('\nCenário 2: Nome vazio');
const invalidForm1 = {
  nome: '',
  valor_objetivo: '1000',
  prazo: '2025-12-31'
};
console.log('Resultado:', validateForm.call({ formData: invalidForm1 }));

// Cenário 3: Valor inválido
console.log('\nCenário 3: Valor inválido');
const invalidForm2 = {
  nome: 'Teste',
  valor_objetivo: '0',
  prazo: '2025-12-31'
};
console.log('Resultado:', validateForm.call({ formData: invalidForm2 })); 