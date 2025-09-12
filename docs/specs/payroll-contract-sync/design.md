# Design Técnico - Sistema de Sincronização de Contratos Payroll

## 1. Visão Geral da Arquitetura

### 1.1 Componentes Principais

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Contract Service  │───▶│  Validation Layer   │───▶│   Database Layer    │
│                     │    │                     │    │                     │
│ - createContract()  │    │ - validateUUID()    │    │ - payroll_contracts │
│ - updateContract()  │    │ - validateInput()   │    │ - related tables    │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Sync Services     │    │   Error Handling    │    │   Audit Logging     │
│                     │    │                     │    │                     │
│ - configSyncService │    │ - UUIDValidationErr │    │ - operation logs    │
│ - subsidyService    │    │ - SyncFailureErr    │    │ - error tracking    │
│ - calculationSvc    │    │ - DatabaseErr       │    │ - performance logs  │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### 1.2 Fluxo de Dados

1. **Validação de Entrada** → UUID rigoroso antes de qualquer operação
2. **Criação de Contrato** → Inserção na tabela principal
3. **Sincronização Automática** → Configurações dependentes
4. **Verificação de Integridade** → Constraints de chave estrangeira
5. **Logging e Auditoria** → Rastreamento completo

## 2. Modelos de Dados

### 2.1 Tabela Principal

```sql
-- payroll_contracts (já existente)
CREATE TABLE payroll_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Tabelas Dependentes (com FK)

Todas as seguintes tabelas têm `contract_id UUID REFERENCES payroll_contracts(id)`:

- `payroll_bonus_configs`
- `payroll_custom_bonuses`
- `payroll_deduction_conditions`
- `payroll_deduction_configs`
- `payroll_holidays`
- `payroll_leaves`
- `payroll_meal_allowance_configs`
- `payroll_mileage_policies`
- `payroll_mileage_trips`
- `payroll_ot_policies`
- `payroll_periods`
- `payroll_time_entries`
- `payroll_vacations`

### 2.3 Índices de Performance

```sql
-- Índices para otimizar consultas por contract_id
CREATE INDEX CONCURRENTLY idx_payroll_bonus_configs_contract_id 
    ON payroll_bonus_configs(contract_id);
CREATE INDEX CONCURRENTLY idx_payroll_periods_contract_id 
    ON payroll_periods(contract_id);
-- ... (similar para todas as tabelas)
```

## 3. Contratos de API

### 3.1 Validação UUID

```typescript
// Função de validação implementada
function validateUUID(contractId: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!contractId || !uuidRegex.test(contractId)) {
        throw new Error('contractId deve ser um UUID válido');
    }
}
```

### 3.2 Serviços Atualizados

#### ConfigSyncService
```typescript
export async function syncConfiguration(contractId: string): Promise<void> {
    // Validação UUID rigorosa implementada
    validateUUID(contractId);
    
    // Resto da implementação...
}
```

#### SubsidyDatabaseService
```typescript
export async function getSubsidyConfig(contractId: string): Promise<SubsidyConfig> {
    // Validação UUID rigorosa implementada
    validateUUID(contractId);
    
    // Resto da implementação...
}
```

#### CalculationService
```typescript
export async function calculatePayroll(contractId: string, ...): Promise<CalculationResult> {
    // Validação UUID rigorosa implementada
    validateUUID(contractId);
    
    // Resto da implementação...
}
```

### 3.3 Taxonomia de Erros

```typescript
// Tipos de erro padronizados
interface ValidationError {
    type: 'VALIDATION_ERROR';
    message: string;
    field: string;
    code: 'INVALID_UUID' | 'MISSING_FIELD' | 'INVALID_FORMAT';
}

interface DatabaseError {
    type: 'DATABASE_ERROR';
    message: string;
    code: 'FOREIGN_KEY_VIOLATION' | 'UNIQUE_VIOLATION' | 'CONNECTION_ERROR';
}

interface SyncError {
    type: 'SYNC_ERROR';
    message: string;
    service: string;
    code: 'CONFIG_SYNC_FAILED' | 'SUBSIDY_SYNC_FAILED' | 'CALCULATION_FAILED';
}
```

## 4. Estratégia de Tratamento de Erros

### 4.1 Validação de Entrada
- **Falha Rápida**: Validação UUID antes de qualquer operação DB
- **Mensagens Claras**: Erros específicos para cada tipo de validação
- **Logging**: Todos os erros de validação são registados

### 4.2 Estados UX
```typescript
interface UIState {
    loading: boolean;
    error: string | null;
    data: any | null;
    retry: () => void;
}

// Estados específicos
- LoadingState: "A criar contrato..."
- ErrorState: "Erro: contractId deve ser um UUID válido"
- SuccessState: "Contrato criado com sucesso"
- RetryState: "Tentar novamente"
```

### 4.3 Rollback e Recuperação
```typescript
// Transações com rollback automático
async function createContractWithSync(contractData: ContractData): Promise<Contract> {
    const transaction = await supabase.rpc('begin_transaction');
    
    try {
        const contract = await createContract(contractData);
        await syncAllConfigurations(contract.id);
        await supabase.rpc('commit_transaction');
        return contract;
    } catch (error) {
        await supabase.rpc('rollback_transaction');
        throw error;
    }
}
```

## 5. Abordagem de Testes

### 5.1 Testes Unitários
```typescript
// Exemplo de teste de validação UUID
describe('UUID Validation', () => {
    it('should accept valid UUID', () => {
        expect(() => validateUUID('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
    });
    
    it('should reject invalid UUID', () => {
        expect(() => validateUUID('invalid-uuid')).toThrow('contractId deve ser um UUID válido');
    });
});
```

### 5.2 Testes de Integração
```typescript
// Teste do fluxo completo
describe('Contract Creation Flow', () => {
    it('should create contract and sync all configurations', async () => {
        const contract = await createContract(mockContractData);
        
        // Verificar se todas as configurações foram sincronizadas
        const configs = await getContractConfigurations(contract.id);
        expect(configs.overtimePolicies).toBeDefined();
        expect(configs.subsidyConfigs).toBeDefined();
        expect(configs.holidays).toBeDefined();
    });
});
```

### 5.3 Testes E2E
```typescript
// Teste de ponta a ponta
describe('Payroll Contract E2E', () => {
    it('should complete full contract lifecycle', async () => {
        // 1. Criar contrato
        // 2. Sincronizar configurações
        // 3. Calcular payroll
        // 4. Verificar integridade
    });
});
```

## 6. Considerações de Performance

### 6.1 Otimizações de Base de Dados
- **Índices**: Em todas as chaves estrangeiras `contract_id`
- **Conexões**: Pool de conexões otimizado
- **Queries**: Prepared statements para validações frequentes

### 6.2 Caching
```typescript
// Cache de configurações por contrato
const configCache = new Map<string, ContractConfig>();

async function getCachedConfig(contractId: string): Promise<ContractConfig> {
    if (configCache.has(contractId)) {
        return configCache.get(contractId)!;
    }
    
    const config = await loadConfigFromDB(contractId);
    configCache.set(contractId, config);
    return config;
}
```

### 6.3 Métricas de Performance
- **Tempo de Validação UUID**: < 10ms
- **Criação de Contrato**: < 2s
- **Sincronização Completa**: < 5s
- **Throughput**: 100+ operações/minuto

## 7. Medidas de Segurança

### 7.1 Row Level Security (RLS)
```sql
-- Política RLS para payroll_contracts
CREATE POLICY "Users can only access their own contracts" 
    ON payroll_contracts 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Políticas similares para todas as tabelas dependentes
CREATE POLICY "Users can only access their contract data" 
    ON payroll_periods 
    FOR ALL 
    USING (auth.uid() = (SELECT user_id FROM payroll_contracts WHERE id = contract_id));
```

### 7.2 Validação de Input
- **Sanitização**: Todos os inputs são sanitizados
- **Validação de Tipo**: TypeScript + Zod para validação runtime
- **Rate Limiting**: Limitação de operações por utilizador

### 7.3 Auditoria
```typescript
// Sistema de logs estruturado
interface AuditLog {
    timestamp: Date;
    userId: string;
    action: string;
    contractId: string;
    details: Record<string, any>;
    success: boolean;
    error?: string;
}

function logOperation(log: AuditLog): void {
    console.log(JSON.stringify({
        ...log,
        level: log.success ? 'info' : 'error'
    }));
}
```

## 8. Escolhas Tecnológicas

### 8.1 Stack Confirmado
- **Frontend**: Next.js 14+ com App Router
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth + Postgres + RLS)
- **Validação**: Zod + TypeScript
- **Testes**: Vitest + Testing Library
- **Logs**: Estruturados em JSON

### 8.2 Justificações
- **UUID Regex**: Validação rigorosa sem dependências externas
- **RLS**: Segurança a nível de base de dados
- **Transações**: Garantia de consistência
- **Índices**: Performance otimizada para consultas frequentes

## 9. Notas de Performance e Segurança

### 9.1 Otimizações Futuras
- Implementar cache Redis para configurações frequentes
- Adicionar compressão para payloads grandes
- Implementar sharding por tenant se necessário

### 9.2 Monitorização
- Métricas de tempo de resposta por endpoint
- Alertas para falhas de validação frequentes
- Dashboard de saúde do sistema de sincronização

### 9.3 Backup e Recuperação
- Backups automáticos da base de dados
- Procedimentos de rollback documentados
- Testes regulares de recuperação de desastres