// Teste simples para validar o schema de email
const { z } = require('zod');

// Recriar o schema de validação aqui para testar
const emailValidation = z
  .string()
  .min(1, 'Email é obrigatório')
  .email('Formato de email inválido')
  .max(254, 'Email demasiado longo')
  .refine(
    (email) => {
      // Verificar se não tem espaços
      return !email.includes(' ');
    },
    { message: 'Email não pode conter espaços' }
  )
  .refine(
    (email) => {
      // Verificar domínio básico
      const domain = email.split('@')[1];
      return domain && domain.includes('.');
    },
    { message: 'Domínio de email inválido' }
  );

const signupSchema = z.object({
  email: emailValidation,
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres'),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
});

// Testes de validação de email
const testCases = [
  { email: 'teste2@teste', expected: false, description: 'Email sem domínio completo' },
  { email: 'invalid-email-format', expected: false, description: 'Email sem @ e domínio' },
  { email: 'test@example.com', expected: true, description: 'Email válido' },
  { email: 'user@domain', expected: false, description: 'Email sem TLD' },
  { email: 'test @example.com', expected: false, description: 'Email com espaços' },
  { email: '', expected: false, description: 'Email vazio' }
];

console.log('🧪 Testando validação de email...');

testCases.forEach(({ email, expected, description }) => {
  try {
    const result = signupSchema.parse({
      email: email,
      password: 'validpassword123',
      nome: 'Test User'
    });
    
    if (expected) {
      console.log(`✅ ${description}: PASSOU (como esperado)`);
    } else {
      console.log(`❌ ${description}: PASSOU (mas deveria FALHAR)`);
      console.log(`   Email: "${email}" foi aceite incorretamente`);
    }
  } catch (error) {
    if (!expected) {
      console.log(`✅ ${description}: FALHOU (como esperado)`);
      console.log(`   Erro: ${error.errors?.[0]?.message || error.message}`);
    } else {
      console.log(`❌ ${description}: FALHOU (mas deveria PASSAR)`);
      console.log(`   Erro: ${error.errors?.[0]?.message || error.message}`);
    }
  }
});

console.log('\n🔍 Teste específico para "teste2@teste":');
try {
  signupSchema.parse({
    email: 'teste2@teste',
    password: 'teste14',
    nome: 'Test User'
  });
  console.log('❌ PROBLEMA: "teste2@teste" foi aceite pela validação!');
} catch (error) {
  console.log('✅ CORRETO: "teste2@teste" foi rejeitado pela validação');
  console.log(`   Erro: ${error.errors?.[0]?.message || error.message}`);
}