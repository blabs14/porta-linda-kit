# Guia de Gestão de Contas Familiares

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Funcionalidades Principais](#funcionalidades-principais)
3. [Interface e Navegação](#interface-e-navegação)
4. [Gestão de Contas Bancárias](#gestão-de-contas-bancárias)
5. [Gestão de Cartões de Crédito](#gestão-de-cartões-de-crédito)
6. [Transferências](#transferências)
7. [Permissões e Segurança](#permissões-e-segurança)
8. [Performance e Otimização](#performance-e-otimização)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

## 🎯 Visão Geral

A página de **Contas Familiares** permite gerir todas as contas bancárias e cartões de crédito partilhados da família. Esta funcionalidade está integrada no sistema de **Finanças Partilhadas** e oferece uma experiência idêntica à **Área Pessoal**, mas com funcionalidades específicas para gestão familiar.

### Características Principais

- ✅ **Interface Consistente**: Mesmo layout e funcionalidades da Área Pessoal
- ✅ **Separação Clara**: Contas Bancárias vs Cartões de Crédito
- ✅ **Permissões Baseadas em Roles**: Controle de acesso por nível de utilizador
- ✅ **Cache Inteligente**: Otimização de performance com React Query
- ✅ **Lazy Loading**: Carregamento sob demanda de componentes pesados
- ✅ **Métricas de Performance**: Monitorização em tempo real

## 🚀 Funcionalidades Principais

### 1. Visualização de Contas
- **Contas Bancárias**: Contas correntes e poupanças partilhadas
- **Cartões de Crédito**: Cartões de crédito e débito familiares
- **Saldo em Tempo Real**: Valores atualizados automaticamente
- **Status Visual**: Indicadores de estado (Em Dia/Em Dívida)

### 2. Operações CRUD
- **Criar**: Adicionar novas contas e cartões
- **Ler**: Visualizar informações detalhadas
- **Atualizar**: Modificar dados existentes
- **Eliminar**: Remover contas com confirmação

### 3. Transferências
- **Entre Contas**: Transferências internas da família
- **Validação**: Verificação de saldos e permissões
- **Histórico**: Registo de todas as transferências

## 🎨 Interface e Navegação

### Layout Responsivo

```
┌─────────────────────────────────────────────────────────┐
│                    Contas Familiares                    │
│              Gerencie as contas partilhadas             │
│  [Transferir] [Nova Conta]                              │
├─────────────────────────────────────────────────────────┤
│  💳 Contas Bancárias                                    │
│  Contas correntes e poupanças partilhadas               │
│  [Nova Conta]                                           │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Conta Corr. │ │ Poupança    │ │ Investimento│       │
│  │ 5.000,00 €  │ │ 10.000,00 € │ │ 15.000,00 € │       │
│  │ [Editar]    │ │ [Editar]    │ │ [Editar]    │       │
│  │ [Eliminar]  │ │ [Eliminar]  │ │ [Eliminar]  │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
├─────────────────────────────────────────────────────────┤
│  💳 Cartões de Crédito                                  │
│  Cartões de crédito e débito partilhados               │
│  [Novo Cartão]                                         │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐                       │
│  │ Cartão Prim.│ │ Cartão Sec. │                       │
│  │ -1.500,00 € │ │ 0,00 €      │                       │
│  │ [Em Dívida] │ │ [Em Dia]    │                       │
│  │ [Editar]    │ │ [Editar]    │                       │
│  │ [Eliminar]  │ │ [Eliminar]  │                       │
│  └─────────────┘ └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Estados da Interface

#### Estado de Carregamento
```typescript
// Exibido durante carregamento inicial
<div className="flex items-center justify-center min-h-[400px]">
  <div className="text-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
    <p className="text-muted-foreground">A carregar contas...</p>
  </div>
</div>
```

#### Estado Vazio
```typescript
// Exibido quando não há contas
<div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
  <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
  <p className="text-sm text-muted-foreground">Nenhuma conta bancária encontrada</p>
</div>
```

## 💳 Gestão de Contas Bancárias

### Estrutura de Dados

```typescript
interface BankAccount {
  account_id: string;
  nome: string;
  tipo: 'conta corrente' | 'poupança' | 'investimento';
  saldo_atual: number;
  saldo_disponivel: number;
  total_reservado: number;
  family_id: string;
  created_at: string;
  updated_at: string;
}
```

### Operações Disponíveis

#### 1. Criar Nova Conta
```typescript
// Exemplo de criação
const newAccount = {
  nome: 'Conta Poupança Família',
  tipo: 'poupança',
  saldo_inicial: 1000,
  family_id: 'family-123'
};

await createFamilyAccount(newAccount);
```

#### 2. Editar Conta
```typescript
// Exemplo de edição
const updatedData = {
  nome: 'Conta Poupança Família Silva',
  saldo_atual: 1500
};

await updateFamilyAccount(accountId, updatedData);
```

#### 3. Eliminar Conta
```typescript
// Exemplo de eliminação
await deleteFamilyAccount(accountId);
```

### Validações

- ✅ **Nome Obrigatório**: Mínimo 3 caracteres
- ✅ **Tipo Válido**: Apenas tipos predefinidos
- ✅ **Saldo Inicial**: Número positivo ou zero
- ✅ **Permissões**: Verificação de role do utilizador

## 💳 Gestão de Cartões de Crédito

### Estrutura de Dados

```typescript
interface CreditCard {
  account_id: string;
  nome: string;
  tipo: 'cartão de crédito';
  saldo_atual: number; // Negativo = dívida
  saldo_disponivel: number;
  limite_credito: number;
  data_vencimento: string;
  family_id: string;
}
```

### Status dos Cartões

#### Em Dia (saldo_atual <= 0)
```typescript
<Badge variant="default" className="text-xs">
  Em Dia
</Badge>
```

#### Em Dívida (saldo_atual > 0)
```typescript
<Badge variant="destructive" className="text-xs">
  Em Dívida
</Badge>
```

### Operações Específicas

#### 1. Pagar Cartão
```typescript
// Exemplo de pagamento
const paymentData = {
  cartao_id: 'card-123',
  valor: 500,
  conta_origem: 'account-456'
};

await payCreditCard(paymentData);
```

#### 2. Ajustar Limite
```typescript
// Exemplo de ajuste de limite
const limitData = {
  cartao_id: 'card-123',
  novo_limite: 5000
};

await updateCreditCardLimit(limitData);
```

## 💸 Transferências

### Tipos de Transferência

#### 1. Entre Contas da Família
```typescript
const transferData = {
  conta_origem: 'account-123',
  conta_destino: 'account-456',
  valor: 1000,
  descricao: 'Transferência para poupança',
  data: new Date().toISOString()
};

await createFamilyTransfer(transferData);
```

#### 2. Pagamento de Cartão
```typescript
const cardPayment = {
  conta_origem: 'account-123',
  cartao_destino: 'card-456',
  valor: 500,
  descricao: 'Pagamento cartão de crédito'
};

await payCreditCard(cardPayment);
```

### Validações de Transferência

- ✅ **Saldo Suficiente**: Verificação na conta de origem
- ✅ **Contas Diferentes**: Origem e destino devem ser diferentes
- ✅ **Valor Positivo**: Apenas valores maiores que zero
- ✅ **Permissões**: Apenas utilizadores autorizados

## 🔐 Permissões e Segurança

### Sistema de Roles

```typescript
type FamilyRole = 'owner' | 'admin' | 'member' | 'viewer';

interface PermissionMatrix {
  owner: ['create', 'read', 'update', 'delete', 'transfer'];
  admin: ['create', 'read', 'update', 'delete', 'transfer'];
  member: ['read', 'update', 'transfer'];
  viewer: ['read'];
}
```

### Verificação de Permissões

```typescript
// Exemplo de verificação
const canEdit = (resourceType: 'account' | 'goal' | 'budget' | 'transaction') => {
  switch (myRole) {
    case 'owner':
    case 'admin':
      return true;
    case 'member':
      return resourceType === 'transaction';
    case 'viewer':
      return false;
    default:
      return false;
  }
};
```

### Segurança de Dados

- ✅ **RLS (Row Level Security)**: Filtros automáticos por família
- ✅ **Validação de Entrada**: Sanitização de dados
- ✅ **Audit Log**: Registo de todas as operações
- ✅ **Criptografia**: Dados sensíveis encriptados

## ⚡ Performance e Otimização

### Cache Inteligente

```typescript
// Configuração de cache por tipo
const CACHE_CONFIGS = {
  accounts: {
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 15 * 60 * 1000,   // 15 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  // ... outras configurações
};
```

### Lazy Loading

```typescript
// Componentes carregados sob demanda
const LazyAccountForm = lazy(() => 
  import('../../components/AccountForm').catch(() => ({
    default: () => <ComponentFallback message="Formulário de Conta" />
  }))
);
```

### Métricas de Performance

```typescript
// Monitorização em tempo real
const { measureRenderTime, recordOperation } = useFamilyMetrics(familyId);

// Medir tempo de renderização
const endRender = measureRenderTime('FamilyAccounts');
// ... renderização do componente
endRender();

// Registar operação
recordOperation('create');
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Contas Não Carregam
```typescript
// Verificar se família está selecionada
if (!familyId) {
  return <EmptyState message="Selecione uma família" />;
}

// Verificar permissões
if (!canView('account')) {
  return <AccessDenied />;
}
```

#### 2. Erro de Permissão
```typescript
// Verificar role do utilizador
console.log('User role:', myRole);
console.log('Required permissions:', requiredPermissions);

// Verificar se família existe
if (!family) {
  return <FamilyNotFound />;
}
```

#### 3. Problemas de Cache
```typescript
// Limpar cache manualmente
const { invalidateCache } = useFamilyCache(familyId);
invalidateCache(['accounts', 'kpis']);

// Forçar recarregamento
const { refetchAll } = useFamily();
refetchAll();
```

### Logs de Debug

```typescript
// Ativar logs detalhados
console.log('[FamilyAccounts] familyId:', familyId);
console.log('[FamilyAccounts] user role:', myRole);
console.log('[FamilyAccounts] accounts data:', familyAccounts);
console.log('[FamilyAccounts] loading state:', isLoading);
```

## ❓ FAQ

### Q: Como adicionar uma nova conta bancária?
**A**: Clique no botão "Nova Conta" na seção "Contas Bancárias" e preencha o formulário com os dados da conta.

### Q: Posso transferir dinheiro entre contas de famílias diferentes?
**A**: Não, as transferências são limitadas às contas da mesma família por questões de segurança.

### Q: Como funciona o status "Em Dia/Em Dívida" dos cartões?
**A**: 
- **Em Dia**: Saldo <= 0 (sem dívida)
- **Em Dívida**: Saldo > 0 (com dívida pendente)

### Q: Posso eliminar uma conta que tem transações?
**A**: Sim, mas todas as transações associadas serão também eliminadas. Uma confirmação será solicitada.

### Q: Como alterar as permissões de um membro?
**A**: Vá para "Membros da Família" e utilize o dropdown de roles para alterar as permissões.

### Q: Os dados são sincronizados em tempo real?
**A**: Sim, utilizando React Query e Supabase Realtime para sincronização automática.

### Q: Como exportar os dados das contas?
**A**: Utilize a funcionalidade de exportação disponível nas configurações da família.

### Q: Posso usar a aplicação offline?
**A**: Dados básicos são cacheados localmente, mas operações de escrita requerem conexão.

## 📚 Recursos Adicionais

### Documentação Técnica
- [FamilyProvider API](./FAMILY_PROVIDER_API.md)
- [Cache Strategy](./CACHE_STRATEGY.md)
- [Performance Guidelines](./PERFORMANCE_GUIDELINES.md)

### Exemplos de Código
- [Componentes Reutilizáveis](./COMPONENTS.md)
- [Hooks Customizados](./HOOKS.md)
- [Testes](./TESTS.md)

### Suporte
- [Issues GitHub](https://github.com/your-repo/issues)
- [Documentação Supabase](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)

---

**Última atualização**: Janeiro 2025  
**Versão**: 1.0.0  
**Autor**: Equipa de Desenvolvimento 