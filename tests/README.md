# Estrutura de Testes - Porta Linda Kit

Este diretório contém todos os testes organizados do projeto, categorizados por tipo e funcionalidade.

## Estrutura de Diretórios

```
tests/
├── unit/                    # Testes unitários
│   ├── hooks/              # Testes dos React hooks
│   ├── services/           # Testes dos serviços (mocked)
│   └── components/         # Testes dos componentes React
├── integration/            # Testes de integração
│   └── services/           # Testes dos serviços com Supabase real
├── e2e/                    # Testes end-to-end
│   └── cypress/            # Testes Cypress
├── manual/                 # Testes manuais e scripts de debug
│   ├── auth/               # Scripts de teste de autenticação
│   ├── database/           # Scripts de teste de base de dados
│   └── api/                # Scripts de teste de API
└── config/                 # Configurações de teste
    ├── setup.ts            # Setup global dos testes
    └── helpers/            # Funções auxiliares para testes
```

## Tipos de Testes

### 1. Testes Unitários (`unit/`)
- **Hooks**: Testam os custom hooks React com mocks dos serviços
- **Services**: Testam a lógica dos serviços com Supabase mockado
- **Components**: Testam componentes React isoladamente

### 2. Testes de Integração (`integration/`)
- Testam a integração real com Supabase
- Usam base de dados de teste
- Verificam fluxos completos de dados

### 3. Testes E2E (`e2e/`)
- Testam fluxos completos da aplicação
- Simulam interações reais do utilizador
- Usam Cypress para automação

### 4. Testes Manuais (`manual/`)
- Scripts para debug e teste manual
- Verificações pontuais de funcionalidades
- Testes de configuração e setup

## Ferramentas Utilizadas

- **Vitest**: Framework de testes unitários e de integração
- **React Testing Library**: Testes de componentes React
- **Cypress**: Testes end-to-end
- **@testing-library/react**: Utilitários para testar React

## Como Executar

```bash
# Todos os testes
npm test

# Apenas testes unitários
npm run test:unit

# Apenas testes de integração
npm run test:integration

# Testes E2E
npm run test:e2e

# Testes em modo watch
npm run test:watch
```

## Convenções

1. **Nomenclatura**: `*.test.ts` para unitários, `*.spec.ts` para integração
2. **Estrutura**: Espelhar a estrutura do código fonte
3. **Mocks**: Usar mocks para dependências externas em testes unitários
4. **Dados**: Usar dados de teste consistentes e limpos
5. **Cleanup**: Sempre limpar estado entre testes