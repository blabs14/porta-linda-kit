# Especificações do Sistema de Sincronização de Contratos Payroll

## 1. Introdução

Este documento especifica as melhorias implementadas no sistema de sincronização de contratos do módulo Payroll, focando na validação rigorosa de UUIDs e integridade referencial.

## 2. Requisitos Funcionais

### 2.1 Validação UUID Rigorosa
**ID:** REQ-2.1  
**Descrição:** Todos os serviços que recebem `contractId` como parâmetro devem validar rigorosamente o formato UUID.

**Critérios de Aceitação (EARS):**
- WHEN um serviço recebe um `contractId`, THE SYSTEM SHALL validar se é um UUID válido usando regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
- IF o `contractId` não for um UUID válido, THEN THE SYSTEM SHALL lançar erro com mensagem "contractId deve ser um UUID válido"
- WHILE a validação ocorre, THE SYSTEM SHALL interromper a execução antes de qualquer operação de base de dados

### 2.2 Integridade Referencial
**ID:** REQ-2.2  
**Descrição:** Todas as tabelas relacionadas ao payroll devem manter integridade referencial com a tabela `payroll_contracts`.

**Critérios de Aceitação (EARS):**
- WHEN um contrato é criado, THE SYSTEM SHALL garantir que todas as tabelas dependentes referenciem corretamente o `contract_id`
- IF uma operação tentar referenciar um `contract_id` inexistente, THEN THE SYSTEM SHALL falhar com constraint de chave estrangeira
- WHILE as sincronizações ocorrem, THE SYSTEM SHALL manter consistência entre todas as tabelas relacionadas

### 2.3 Sincronização Automática
**ID:** REQ-2.3  
**Descrição:** O sistema deve sincronizar automaticamente configurações quando um novo contrato é criado.

**Critérios de Aceitação (EARS):**
- WHEN um novo contrato é criado, THE SYSTEM SHALL sincronizar automaticamente políticas de horas extras, feriados e configurações de subsídios
- IF a sincronização falhar, THEN THE SYSTEM SHALL reverter a criação do contrato
- WHILE a sincronização ocorre, THE SYSTEM SHALL manter logs detalhados para auditoria

## 3. Requisitos de Segurança

### 3.1 Validação de Entrada
**ID:** SEC-3.1  
**Descrição:** Todos os inputs devem ser validados antes do processamento.

**Critérios de Aceitação:**
- Validação de formato UUID em todos os parâmetros `contractId`
- Sanitização de inputs para prevenir injeção SQL
- Rate limiting em operações de sincronização

### 3.2 Controlo de Acesso
**ID:** SEC-3.2  
**Descrição:** Apenas utilizadores autorizados podem criar/modificar contratos.

**Critérios de Aceitação:**
- RLS (Row Level Security) ativo em todas as tabelas payroll
- Verificação de permissões antes de operações CRUD
- Logs de auditoria para todas as operações

## 4. Requisitos de Performance

### 4.1 Tempo de Resposta
**ID:** PERF-4.1  
**Descrição:** As operações de sincronização devem ser eficientes.

**Critérios de Aceitação:**
- Criação de contrato completa em < 2 segundos
- Validação UUID em < 10ms
- Sincronização de configurações em < 5 segundos

### 4.2 Escalabilidade
**ID:** PERF-4.2  
**Descrição:** O sistema deve suportar múltiplos contratos simultâneos.

**Critérios de Aceitação:**
- Suporte a 100+ contratos por utilizador
- Operações concorrentes sem deadlocks
- Índices otimizados em chaves estrangeiras

## 5. Casos Extremos

### 5.1 UUID Inválido
- Input: `contractId = "invalid-uuid"`
- Resultado Esperado: Erro "contractId deve ser um UUID válido"

### 5.2 Contrato Inexistente
- Input: `contractId = "550e8400-e29b-41d4-a716-446655440000"` (UUID válido mas inexistente)
- Resultado Esperado: Erro de constraint de chave estrangeira

### 5.3 Falha de Sincronização
- Cenário: Erro na sincronização de políticas
- Resultado Esperado: Rollback da criação do contrato

## 6. Dependências

- Supabase Database com RLS ativo
- Tabela `payroll_contracts` como referência principal
- Serviços de validação UUID implementados
- Sistema de logs para auditoria

## 7. Critérios de Aceitação Globais

- Todos os testes unitários passam
- Testes de integração validam fluxo completo
- Documentação técnica atualizada
- Performance dentro dos limites especificados
- Segurança validada por auditoria