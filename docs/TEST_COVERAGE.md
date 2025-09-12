# Guia de Cobertura de Testes

## Visão Geral

Este documento descreve a configuração e uso das métricas de cobertura de testes no projeto Family Flow Finance.

## Scripts Disponíveis

### Execução de Testes com Cobertura

```bash
# Executar testes com cobertura (relatório no terminal)
npm run test:coverage

# Executar testes com cobertura e abrir relatório HTML
npm run test:coverage:report

# Abrir relatório HTML existente
npm run test:coverage:open

# Executar testes com cobertura em modo watch
npm run test:coverage:watch

# Executar testes com cobertura e interface UI
npm run test:coverage:ui
```

## Configuração de Thresholds

Os thresholds de cobertura estão configurados em `tests/config/vitest.config.ts`:

### Thresholds Globais
- **Branches**: 35%
- **Functions**: 25%
- **Lines**: 9%
- **Statements**: 9%

### Thresholds por Componente

#### Componentes UI (`src/components/ui/**`)
- **Branches**: 20%
- **Functions**: 10%
- **Lines**: 13%
- **Statements**: 13%

#### Serviços (`src/services/**`)
- **Branches**: 35%
- **Functions**: 25%
- **Lines**: 9%
- **Statements**: 9%

#### Hooks (`src/hooks/**`)
- **Branches**: 60%
- **Functions**: 50%
- **Lines**: 19%
- **Statements**: 19%

## Relatórios Gerados

### Formatos Disponíveis
1. **HTML**: `coverage/index.html` - Relatório interativo detalhado
2. **LCOV**: `coverage/lcov.info` - Para integração com ferramentas externas
3. **JSON**: `coverage/coverage-final.json` - Dados estruturados
4. **Text**: Saída no terminal durante execução

### Visualização

O relatório HTML oferece:
- Visão geral da cobertura por diretório
- Detalhes linha por linha para cada arquivo
- Navegação interativa pelo código
- Identificação de linhas não cobertas

## Áreas de Melhoria

### Arquivos com 0% de Cobertura

Os seguintes arquivos precisam de testes:

#### Schemas de Validação
- `attachmentSchema.ts`
- `budgetSchema.ts`
- `familyInviteSchema.ts`
- `fixedExpenseSchema.ts`
- `goalAllocationSchema.ts`
- `goalSchema.ts`
- `notificationSchema.ts`
- `personalSettingsSchema.ts`
- `profileSchema.ts`
- `reminderSchema.ts`
- `settingsSchema.ts`
- `transactionSchema.ts`
- `webhookSchema.ts`

#### Outros Arquivos
- Vários componentes UI
- Alguns serviços específicos
- Hooks personalizados

## Estratégia de Melhoria

### Prioridades
1. **Alta**: Componentes críticos de UI e serviços principais
2. **Média**: Hooks e utilitários
3. **Baixa**: Schemas de validação e arquivos auxiliares

### Abordagem Incremental
1. Começar com arquivos mais utilizados
2. Focar em funcionalidades críticas
3. Aumentar thresholds gradualmente
4. Manter qualidade dos testes existentes

## Integração CI/CD

A cobertura de testes está integrada no pipeline de CI/CD:
- Execução automática em pull requests
- Falha do build se thresholds não forem atingidos
- Relatórios disponíveis como artefatos

## Comandos Úteis

```bash
# Executar apenas testes que passam (excluindo problemáticos)
npx vitest run --coverage --config tests/config/vitest.config.ts tests/unit/components tests/unit/hooks tests/unit/services/accounts.test.ts

# Verificar cobertura de um arquivo específico
npx vitest run --coverage --config tests/config/vitest.config.ts tests/unit/services/accounts.test.ts

# Executar com verbose para mais detalhes
npx vitest run --coverage --reporter=verbose --config tests/config/vitest.config.ts
```

## Troubleshooting

### Problemas Comuns

1. **Thresholds não atingidos**: Ajustar valores em `vitest.config.ts`
2. **Testes falhando**: Excluir temporariamente com `--exclude`
3. **Relatório não gerado**: Verificar se `@vitest/coverage-v8` está instalado

### Logs e Debug

- Usar `--reporter=verbose` para mais detalhes
- Verificar logs no terminal para erros específicos
- Consultar `coverage/lcov-report/index.html` para detalhes visuais

---

**Nota**: Este documento será atualizado conforme a cobertura de testes evolui e novos thresholds são estabelecidos.