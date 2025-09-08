# Queries Atualizadas - Feriados com Contratos

## Resumo das Alterações

Todas as queries de feriados foram atualizadas para:
1. **Incluir informações do contrato** através de JOIN
2. **Filtrar apenas contratos ativos** (`is_active = true`)
3. **Validar associações** entre utilizadores e contratos
4. **Suportar filtros por contrato específico**

## Funções Atualizadas

### 1. `getHolidays()` - Buscar Feriados

**Antes:**
```typescript
let query = supabase
  .from('payroll_holidays')
  .select('*')
  .eq('user_id', userId);
```

**Depois:**
```typescript
let query = supabase
  .from('payroll_holidays')
  .select(`
    *,
    payroll_contracts!inner(
      id,
      name,
      is_active
    )
  `)
  .eq('user_id', userId)
  .eq('payroll_contracts.is_active', true);

// Suporte para filtro por contrato específico
if (typeof endOrContractId === 'string' && endOrContractId) {
  query = query.eq('contract_id', endOrContractId);
}
```

**Benefícios:**
- ✅ Retorna apenas feriados de contratos ativos
- ✅ Inclui informações do contrato (nome, estado)
- ✅ Suporta filtro por contrato específico
- ✅ Mantém retrocompatibilidade

### 2. `createHoliday()` - Criar Feriado

**Antes:**
```typescript
const { data, error } = await supabase
  .from('payroll_holidays')
  .insert({ ...holidayData, user_id: userId })
  .select()
  .single();
```

**Depois:**
```typescript
// Validar que o contract_id pertence ao utilizador
if (holidayData.contract_id) {
  const { data: contract } = await supabase
    .from('payroll_contracts')
    .select('id')
    .eq('id', holidayData.contract_id)
    .eq('user_id', userId)
    .single();
  
  if (!contract) {
    throw new Error('Contrato não encontrado ou não pertence ao utilizador');
  }
}

const { data, error } = await supabase
  .from('payroll_holidays')
  .insert({ ...holidayData, user_id: userId })
  .select()
  .single();
```

**Benefícios:**
- ✅ Valida que o contrato pertence ao utilizador
- ✅ Previne associações inválidas
- ✅ Mantém segurança dos dados

### 3. Funções de Validação

**Antes:**
```typescript
const { data: holidays } = await supabase
  .from('payroll_holidays')
  .select('id')
  .eq('user_id', userId)
  .gte('date', start)
  .lte('date', end);
```

**Depois:**
```typescript
const { data: holidays } = await supabase
  .from('payroll_holidays')
  .select(`
    id,
    payroll_contracts!inner(
      id,
      is_active
    )
  `)
  .eq('user_id', userId)
  .eq('payroll_contracts.is_active', true)
  .gte('date', start)
  .lte('date', end);
```

**Benefícios:**
- ✅ Valida apenas feriados de contratos ativos
- ✅ Melhora precisão das validações
- ✅ Evita falsos positivos

### 4. Página de Debug

**Antes:**
```typescript
const { data: allHolidays } = await supabase
  .from('payroll_holidays')
  .select('*')
  .gte('date', '2025-01-01')
  .lte('date', '2025-12-31');
```

**Depois:**
```typescript
const { data: allHolidays } = await supabase
  .from('payroll_holidays')
  .select(`
    *,
    payroll_contracts(
      id,
      name,
      is_active
    )
  `)
  .gte('date', '2025-01-01')
  .lte('date', '2025-12-31');
```

**Benefícios:**
- ✅ Mostra informações completas do contrato
- ✅ Facilita debug de associações
- ✅ Identifica contratos inativos

## Queries SQL Equivalentes

### Buscar Feriados por Utilizador e Ano
```sql
SELECT 
  ph.*,
  pc.name as contract_name,
  pc.is_active
FROM payroll_holidays ph
INNER JOIN payroll_contracts pc ON ph.contract_id = pc.id
WHERE ph.user_id = $1 
  AND pc.is_active = true
  AND ph.date >= $2 
  AND ph.date <= $3
ORDER BY ph.date;
```

### Buscar Feriados por Contrato Específico
```sql
SELECT 
  ph.*,
  pc.name as contract_name
FROM payroll_holidays ph
INNER JOIN payroll_contracts pc ON ph.contract_id = pc.id
WHERE ph.user_id = $1 
  AND ph.contract_id = $2
  AND pc.is_active = true
  AND ph.date >= $3 
  AND ph.date <= $4
ORDER BY ph.date;
```

### Validar Configuração de Feriados
```sql
SELECT COUNT(*) as holiday_count
FROM payroll_holidays ph
INNER JOIN payroll_contracts pc ON ph.contract_id = pc.id
WHERE ph.user_id = $1 
  AND pc.is_active = true
  AND ph.date >= $2 
  AND ph.date <= $3;
```

## Impacto nas Aplicações

### ✅ Melhorias
- **Consistência**: Todos os feriados estão associados a contratos
- **Performance**: Queries otimizadas com JOINs e índices
- **Segurança**: Validação de associações utilizador-contrato
- **Flexibilidade**: Suporte para múltiplos contratos

### ⚠️ Considerações
- **Retrocompatibilidade**: Mantida para assinaturas existentes
- **Migração**: Dados órfãos foram associados automaticamente
- **Validação**: Novas validações podem rejeitar dados inválidos

## Próximos Passos

1. ✅ **Queries atualizadas** - Concluído
2. 🔄 **Interface atualizada** - Próxima tarefa
3. 🔄 **Testes de integração** - Pendente

## Testes Recomendados

```typescript
// Testar busca de feriados por ano
const holidays2025 = await getHolidays(userId, 2025);

// Testar busca por contrato específico
const contractHolidays = await getHolidays(userId, 2025, contractId);

// Testar criação com validação
const newHoliday = await createHoliday({
  date: '2025-12-25',
  name: 'Natal',
  contract_id: contractId
}, userId);

// Testar validação de configuração
const validation = await validatePayrollConfiguration(userId, contractId, 2025);
```