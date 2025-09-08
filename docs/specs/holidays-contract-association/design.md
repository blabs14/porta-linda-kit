# Design: Associação de Feriados com Contratos

## Problema Identificado

Atualmente, a tabela `payroll_holidays` já possui o campo `contract_id`, mas:
- Alguns feriados têm `contract_id = null` (como os do utilizador atual)
- Outros feriados estão corretamente associados a contratos específicos
- Isto causa inconsistências na aplicação dos feriados

## Estrutura Atual

### Tabela `payroll_holidays`
```sql
- id (uuid, PK)
- user_id (uuid, NOT NULL)
- family_id (uuid, nullable)
- contract_id (uuid, nullable) -- PROBLEMA: deveria ser NOT NULL
- date (date, NOT NULL)
- name (text, NOT NULL)
- holiday_type (text)
- is_paid (boolean)
- country_code (text)
- created_at, updated_at
```

### Tabela `payroll_contracts`
```sql
- id (uuid, PK)
- user_id (uuid, NOT NULL)
- family_id (uuid, nullable)
- name (text, NOT NULL)
- is_active (boolean, default true)
- base_salary_cents (integer)
- currency (text, default 'EUR')
- ... outros campos
```

## Solução Proposta

### 1. Regras de Negócio
- **Todos os feriados devem estar associados a um contrato**
- Feriados nacionais aplicam-se a todos os contratos ativos do utilizador
- Feriados personalizados podem ser específicos de um contrato
- Quando um utilizador não tem contratos, não deve ter feriados

### 2. Migração de Dados

#### Passo 1: Criar contratos padrão para utilizadores sem contratos
```sql
-- Para utilizadores com feriados mas sem contratos
INSERT INTO payroll_contracts (user_id, name, base_salary_cents, currency, is_active)
SELECT DISTINCT 
    ph.user_id,
    'Contrato Principal' as name,
    0 as base_salary_cents,
    'EUR' as currency,
    true as is_active
FROM payroll_holidays ph
LEFT JOIN payroll_contracts pc ON ph.user_id = pc.user_id
WHERE ph.contract_id IS NULL 
  AND pc.id IS NULL;
```

#### Passo 2: Associar feriados órfãos aos contratos
```sql
-- Associar feriados sem contrato ao contrato ativo do utilizador
UPDATE payroll_holidays 
SET contract_id = (
    SELECT pc.id 
    FROM payroll_contracts pc 
    WHERE pc.user_id = payroll_holidays.user_id 
      AND pc.is_active = true 
    LIMIT 1
)
WHERE contract_id IS NULL;
```

#### Passo 3: Tornar contract_id obrigatório
```sql
-- Adicionar constraint NOT NULL
ALTER TABLE payroll_holidays 
ALTER COLUMN contract_id SET NOT NULL;

-- Adicionar foreign key se não existir
ALTER TABLE payroll_holidays 
ADD CONSTRAINT fk_payroll_holidays_contract 
FOREIGN KEY (contract_id) REFERENCES payroll_contracts(id) 
ON DELETE CASCADE;
```

### 3. Queries Atualizadas

#### Buscar feriados por utilizador e contrato
```sql
SELECT ph.*, pc.name as contract_name
FROM payroll_holidays ph
JOIN payroll_contracts pc ON ph.contract_id = pc.id
WHERE ph.user_id = $1 
  AND pc.is_active = true
  AND ph.date >= $2 
  AND ph.date <= $3
ORDER BY ph.date;
```

#### Buscar feriados para todos os contratos ativos
```sql
SELECT ph.*, pc.name as contract_name
FROM payroll_holidays ph
JOIN payroll_contracts pc ON ph.contract_id = pc.id
WHERE ph.user_id = $1 
  AND pc.is_active = true
ORDER BY ph.date, pc.name;
```

### 4. Impacto na Interface

#### Página de Debug
- Mostrar feriados agrupados por contrato
- Indicar se existem contratos sem feriados
- Mostrar estatísticas de feriados por contrato

#### Gestão de Feriados
- Permitir associar feriados a contratos específicos
- Opção para aplicar feriados nacionais a todos os contratos
- Validação: não permitir feriados sem contrato

### 5. Validações e Constraints

```sql
-- Garantir que user_id do feriado corresponde ao user_id do contrato
ALTER TABLE payroll_holidays 
ADD CONSTRAINT check_user_contract_consistency 
CHECK (
    user_id = (
        SELECT user_id 
        FROM payroll_contracts 
        WHERE id = contract_id
    )
);
```

### 6. Casos Edge

- **Utilizador sem contratos**: Não deve ter feriados
- **Contrato desativado**: Feriados mantêm-se mas não são aplicados
- **Eliminação de contrato**: Feriados são eliminados em cascata
- **Múltiplos contratos**: Feriados nacionais duplicados para cada contrato

### 7. Performance

- Índices necessários:
  ```sql
  CREATE INDEX idx_payroll_holidays_user_contract ON payroll_holidays(user_id, contract_id);
  CREATE INDEX idx_payroll_holidays_date_range ON payroll_holidays(date, user_id);
  CREATE INDEX idx_payroll_contracts_user_active ON payroll_contracts(user_id, is_active);
  ```

## Próximos Passos

1. ✅ Análise do esquema atual
2. ✅ Design da solução
3. 🔄 Implementar migração de dados
4. ⏳ Atualizar queries da aplicação
5. ⏳ Atualizar interface de utilizador
6. ⏳ Testes de integração