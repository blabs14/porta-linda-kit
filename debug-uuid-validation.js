// Script de teste para verificar a validação UUID

// Função isValidUUID copiada do validation.ts
function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    console.log('🔧 isValidUUID - UUID inválido (não é string):', { uuid, type: typeof uuid });
    return false;
  }
  
  const trimmedUuid = uuid.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const result = uuidRegex.test(trimmedUuid);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 isValidUUID - Validação:', {
      original: uuid,
      trimmed: trimmedUuid,
      length: trimmedUuid.length,
      result,
      regex: uuidRegex.toString()
    });
  }
  
  return result;
}

// Função validateContractId copiada do payrollService.ts
function validateContractId(contractId) {
  console.log('🔧 validateContractId - Iniciando validação:', {
    contractId,
    type: typeof contractId,
    length: contractId?.length
  });
  
  if (!contractId) {
    throw new Error('ID do contrato é obrigatório');
  }
  
  if (typeof contractId !== 'string') {
    throw new Error('ID do contrato deve ser uma string');
  }
  
  const trimmedId = contractId.trim();
  if (!trimmedId) {
    throw new Error('ID do contrato não pode estar vazio');
  }
  
  if (!isValidUUID(trimmedId)) {
    console.log('🔧 validateContractId - UUID inválido detectado:', {
      original: contractId,
      trimmed: trimmedId,
      length: trimmedId.length
    });
    throw new Error('ID do contrato inválido');
  }
  
  console.log('🔧 validateContractId - Validação bem-sucedida');
  return trimmedId;
}

// Testes
console.log('=== TESTE DE VALIDAÇÃO UUID ===');

// Teste 1: UUID válido
try {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  console.log('\nTeste 1 - UUID válido:', validUuid);
  validateContractId(validUuid);
  console.log('✅ Teste 1 passou');
} catch (error) {
  console.log('❌ Teste 1 falhou:', error.message);
}

// Teste 2: UUID com espaços
try {
  const uuidWithSpaces = ' 123e4567-e89b-12d3-a456-426614174000 ';
  console.log('\nTeste 2 - UUID com espaços:', JSON.stringify(uuidWithSpaces));
  validateContractId(uuidWithSpaces);
  console.log('✅ Teste 2 passou');
} catch (error) {
  console.log('❌ Teste 2 falhou:', error.message);
}

// Teste 3: UUID inválido
try {
  const invalidUuid = 'invalid-uuid';
  console.log('\nTeste 3 - UUID inválido:', invalidUuid);
  validateContractId(invalidUuid);
  console.log('✅ Teste 3 passou (não deveria)');
} catch (error) {
  console.log('✅ Teste 3 falhou como esperado:', error.message);
}

// Teste 4: String vazia
try {
  const emptyString = '';
  console.log('\nTeste 4 - String vazia:', JSON.stringify(emptyString));
  validateContractId(emptyString);
  console.log('✅ Teste 4 passou (não deveria)');
} catch (error) {
  console.log('✅ Teste 4 falhou como esperado:', error.message);
}

// Teste 5: null/undefined
try {
  console.log('\nTeste 5 - null');
  validateContractId(null);
  console.log('✅ Teste 5 passou (não deveria)');
} catch (error) {
  console.log('✅ Teste 5 falhou como esperado:', error.message);
}

console.log('\n=== TESTES CONCLUÍDOS ===');