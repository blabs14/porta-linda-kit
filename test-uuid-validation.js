// Teste simples para verificar validações UUID
import { getSubsidyConfig } from './src/features/payroll/services/subsidyDatabaseService.ts';
import { syncConfiguration } from './src/features/payroll/services/configSyncService.ts';

// Teste com UUID inválido
console.log('Testando validações UUID...');

async function testValidations() {
    // Teste com UUID inválido
    try {
        await getSubsidyConfig('invalid-uuid');
        console.log('❌ ERRO: Deveria ter falhado com UUID inválido');
    } catch (error) {
        console.log('✅ SUCESSO: Validação UUID funcionou:', error.message);
    }

    // Teste com UUID válido
    try {
        const validUUID = '550e8400-e29b-41d4-a716-446655440000';
        console.log('🔄 Testando UUID válido:', validUUID);
        // Esta chamada pode falhar por outros motivos (ex: contrato não existe)
        // mas não deve falhar por validação UUID
        await syncConfiguration(validUUID);
        console.log('✅ SUCESSO: UUID válido aceite');
    } catch (error) {
        if (error.message.includes('contractId deve ser um UUID válido')) {
            console.log('❌ ERRO: UUID válido foi rejeitado');
        } else {
            console.log('✅ SUCESSO: UUID válido aceite (falhou por outro motivo):', error.message);
        }
    }
}

testValidations().catch(console.error);

console.log('Teste de validação UUID concluído.');