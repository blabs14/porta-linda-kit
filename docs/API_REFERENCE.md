# 🔌 API Reference - Porta Linda Kit

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Autenticação](#autenticação)
- [Endpoints](#endpoints)
- [Schemas](#schemas)
- [Edge Functions](#edge-functions)
- [Real-time Subscriptions](#real-time-subscriptions)
- [Códigos de Erro](#códigos-de-erro)
- [Rate Limiting](#rate-limiting)
- [Exemplos](#exemplos)

---

## 🎯 Visão Geral

A API do Porta Linda Kit é construída sobre o Supabase, fornecendo:

- **REST API**: Operações CRUD automáticas
- **GraphQL**: Queries flexíveis (opcional)
- **Real-time**: Subscriptions WebSocket
- **Edge Functions**: Lógica de negócio customizada
- **Row Level Security**: Segurança a nível de linha

### Base URL
```
https://your-project.supabase.co/rest/v1/
```

### Headers Obrigatórios
```http
Content-Type: application/json
apikey: your_anon_key
Authorization: Bearer your_access_token
```

---

## 🔐 Autenticação

### Login com Email/Password

```http
POST /auth/v1/token?grant_type=password
Content-Type: application/json
apikey: your_anon_key

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### OAuth Providers

```http
GET /auth/v1/authorize?provider=google&redirect_to=https://yourapp.com/callback
```

**Providers Suportados:**
- `google`
- `apple`
- `facebook`

### Refresh Token

```http
POST /auth/v1/token?grant_type=refresh_token
Content-Type: application/json
apikey: your_anon_key

{
  "refresh_token": "your_refresh_token"
}
```

### Logout

```http
POST /auth/v1/logout
Authorization: Bearer your_access_token
apikey: your_anon_key
```

---

## 📡 Endpoints

### Famílias

#### Listar Famílias do Utilizador
```http
GET /families?select=*,family_members(*)
Authorization: Bearer your_access_token
```

#### Criar Família
```http
POST /families
Content-Type: application/json
Authorization: Bearer your_access_token

{
  "name": "Família Silva"
}
```

#### Atualizar Família
```http
PATCH /families?id=eq.family_id
Content-Type: application/json
Authorization: Bearer your_access_token

{
  "name": "Novo Nome da Família"
}
```

#### Eliminar Família
```http
DELETE /families?id=eq.family_id
Authorization: Bearer your_access_token
```

### Membros da Família

#### Listar Membros
```http
GET /family_members?family_id=eq.family_id&select=*,profiles(*)
Authorization: Bearer your_access_token
```

#### Convidar Membro
```http
POST /family_invites
Content-Type: application/json
Authorization: Bearer your_access_token

{
  "family_id": "uuid",
  "email": "novo@membro.com",
  "role": "member"
}
```

#### Atualizar Role do Membro
```http
PATCH /family_members?id=eq.member_id
Content-Type: application/json
Authorization: Bearer your_access_token

{
  "role": "admin"
}
```

#### Remover Membro
```http
DELETE /family_members?id=eq.member_id
Authorization: Bearer your_access_token
```

### Contas

#### Listar Contas
```http
GET /accounts?family_id=eq.family_id&is_active=eq.true&select=*,transactions(count)
Authorization: Bearer your_access_token
```

#### Criar Conta
```http
POST /accounts
Content-Type: application/json
Authorization: Bearer your_access_token

{
  "family_id": "uuid",
  "name": "Conta Corrente",
  "type": "checking",
  "balance": 1000.50,
  "currency": "EUR"
}
```

#### Atualizar Conta
```http
PATCH /accounts?id=eq.account_id
Content-Type: application/json
Authorization: Bearer your_access_token

{
  "name": "Nova Conta Corrente",
  "balance": 1500.75
}
```

#### Eliminar Conta
```http
DELETE /accounts?id=eq.account_id
Authorization: Bearer your_access_token
```

### Transações

#### Listar Transações
```http
GET /transactions?account_id=eq.account_id&order=date.desc&limit=50&select=*,categories(*),accounts(*)
Authorization: Bearer your_access_token
```

**Filtros Disponíveis:**
- `date=gte.2024-01-01` - Data maior ou igual
- `date=lte.2024-12-31` - Data menor ou igual
- `type=eq.expense` - Tipo específico
- `category_id=eq.uuid` - Categoria específica
- `amount=gte.100` - Valor mínimo

#### Criar Transação
```http
POST /transactions
Content-Type: application/json
Authorization: Bearer your_access_token

{
  "account_id": "uuid",
  "amount": 50.25,
  "type": "expense",
  "category_id": "uuid",
  "description": "Compras no supermercado",
  "date": "2024-01-15"
}
```

#### Atualizar Transação
```http
PATCH /transactions?id=eq.transaction_id
Content-Type: application/json
Authorization: Bearer your_access_token

{
  "amount": 55.30,
  "description": "Compras no supermercado - atualizado"
}
```

#### Eliminar Transação
```http
DELETE /transactions?id=eq.transaction_id
Authorization: Bearer your_access_token
```

### Categorias

#### Listar Categorias
```http
GET /categories?family_id=eq.family_id&is_active=eq.true&order=name.asc
Authorization: Bearer your_access_token
```

#### Criar Categoria
```http
POST /categories
Content-Type: application/json
Authorization: Bearer your_access_token

{
  "family_id": "uuid",
  "name": "Alimentação",
  "type": "expense",
  "color": "#FF6B6B",
  "icon": "🍽️",
  "parent_id": null
}
```

### Orçamentos

#### Listar Orçamentos
```http
GET /budgets?family_id=eq.family_id&period_start=gte.2024-01-01&select=*,budget_categories(*,categories(*))
Authorization: Bearer your_access_token
```

#### Criar Orçamento
```http
POST /budgets
Content-Type: application/json
Authorization: Bearer your_access_token

{
  "family_id": "uuid",
  "name": "Orçamento Janeiro 2024",
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "total_amount": 2000.00
}
```

### Objetivos

#### Listar Objetivos
```http
GET /goals?family_id=eq.family_id&is_active=eq.true&select=*,goal_contributions(*)
Authorization: Bearer your_access_token
```

#### Criar Objetivo
```http
POST /goals
Content-Type: application/json
Authorization: Bearer your_access_token

{
  "family_id": "uuid",
  "name": "Férias de Verão",
  "target_amount": 3000.00,
  "target_date": "2024-07-01",
  "auto_funding_enabled": true,
  "auto_funding_percentage": 10.0
}
```

#### Contribuir para Objetivo
```http
POST /goal_contributions
Content-Type: application/json
Authorization: Bearer your_access_token

{
  "goal_id": "uuid",
  "amount": 150.00,
  "source_account_id": "uuid",
  "description": "Contribuição mensal"
}
```

---

## 📊 Schemas

### User Profile
```typescript
interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  preferred_currency: string
  preferred_language: string
  timezone: string
  created_at: string
  updated_at: string
}
```

### Family
```typescript
interface Family {
  id: string
  name: string
  currency: string
  created_at: string
  updated_at: string
}
```

### Family Member
```typescript
type FamilyRole = 'owner' | 'admin' | 'member' | 'viewer'

interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  role: FamilyRole
  joined_at: string
  profile?: Profile
}
```

### Account
```typescript
type AccountType = 'checking' | 'savings' | 'investment' | 'credit_card' | 'cash' | 'other'

interface Account {
  id: string
  family_id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}
```

### Transaction
```typescript
type TransactionType = 'income' | 'expense' | 'transfer'

interface Transaction {
  id: string
  account_id: string
  amount: number
  type: TransactionType
  category_id?: string
  description?: string
  date: string
  created_at: string
  updated_at: string
  
  // Relações
  account?: Account
  category?: Category
  transfer_to_transaction_id?: string
}
```

### Category
```typescript
interface Category {
  id: string
  family_id: string
  name: string
  type: TransactionType
  color: string
  icon?: string
  parent_id?: string
  is_active: boolean
  created_at: string
  
  // Relações
  children?: Category[]
  parent?: Category
}
```

### Budget
```typescript
interface Budget {
  id: string
  family_id: string
  name: string
  period_start: string
  period_end: string
  total_amount: number
  created_at: string
  
  // Relações
  budget_categories?: BudgetCategory[]
}

interface BudgetCategory {
  id: string
  budget_id: string
  category_id: string
  allocated_amount: number
  spent_amount: number
  
  // Relações
  category?: Category
}
```

### Goal
```typescript
interface Goal {
  id: string
  family_id: string
  name: string
  description?: string
  target_amount: number
  current_amount: number
  target_date?: string
  is_active: boolean
  auto_funding_enabled: boolean
  auto_funding_percentage?: number
  created_at: string
  
  // Relações
  contributions?: GoalContribution[]
}

interface GoalContribution {
  id: string
  goal_id: string
  amount: number
  source_account_id: string
  description?: string
  created_at: string
  
  // Relações
  source_account?: Account
}
```

---

## ⚡ Edge Functions

### Goal Funding Cron
**Endpoint:** `https://your-project.supabase.co/functions/v1/goal-funding-cron`

**Descrição:** Processa financiamento automático de objetivos

**Método:** `POST`

**Headers:**
```http
Authorization: Bearer your_service_role_key
Content-Type: application/json
```

**Resposta:**
```json
{
  "success": true,
  "processed": 5,
  "total_funded": 250.00
}
```

### Push Delivery
**Endpoint:** `https://your-project.supabase.co/functions/v1/push-delivery`

**Descrição:** Envia notificações push

**Método:** `POST`

**Body:**
```json
{
  "user_id": "uuid",
  "title": "Orçamento Excedido",
  "body": "Categoria 'Alimentação' excedeu 90% do orçamento",
  "data": {
    "type": "budget_alert",
    "category_id": "uuid"
  }
}
```

### Reminders Push Cron
**Endpoint:** `https://your-project.supabase.co/functions/v1/reminders-push-cron`

**Descrição:** Envia lembretes automáticos

**Método:** `POST`

**Resposta:**
```json
{
  "success": true,
  "reminders_sent": 12
}
```

---

## 🔄 Real-time Subscriptions

### Transações em Tempo Real
```typescript
// Subscrever mudanças em transações
const subscription = supabase
  .channel('transactions')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'transactions',
      filter: `account_id=eq.${accountId}`
    },
    (payload) => {
      console.log('Transação alterada:', payload)
      // Atualizar estado local
    }
  )
  .subscribe()

// Cancelar subscrição
subscription.unsubscribe()
```

### Saldos de Contas
```typescript
// Subscrever mudanças em saldos
const subscription = supabase
  .channel('account_balances')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'accounts',
      filter: `family_id=eq.${familyId}`
    },
    (payload) => {
      console.log('Saldo atualizado:', payload.new)
    }
  )
  .subscribe()
```

### Notificações
```typescript
// Subscrever notificações do utilizador
const subscription = supabase
  .channel('user_notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Nova notificação:', payload.new)
      // Mostrar notificação na UI
    }
  )
  .subscribe()
```

---

## ❌ Códigos de Erro

### HTTP Status Codes

| Código | Descrição | Exemplo |
|--------|-----------|----------|
| `200` | Sucesso | Operação realizada com sucesso |
| `201` | Criado | Recurso criado com sucesso |
| `400` | Bad Request | Dados inválidos no request |
| `401` | Unauthorized | Token de acesso inválido |
| `403` | Forbidden | Sem permissões para o recurso |
| `404` | Not Found | Recurso não encontrado |
| `409` | Conflict | Conflito (ex: email já existe) |
| `422` | Unprocessable Entity | Validação falhou |
| `429` | Too Many Requests | Rate limit excedido |
| `500` | Internal Server Error | Erro interno do servidor |

### Formato de Erro
```json
{
  "error": {
    "code": "validation_failed",
    "message": "Os dados fornecidos são inválidos",
    "details": {
      "field": "email",
      "issue": "Formato de email inválido"
    }
  }
}
```

### Códigos de Erro Específicos

#### Autenticação
- `invalid_credentials` - Email/password incorretos
- `email_not_confirmed` - Email não confirmado
- `token_expired` - Token de acesso expirado
- `invalid_token` - Token inválido

#### Autorização
- `insufficient_permissions` - Permissões insuficientes
- `family_access_denied` - Sem acesso à família
- `resource_not_owned` - Recurso não pertence ao utilizador

#### Validação
- `validation_failed` - Dados não passaram na validação
- `required_field_missing` - Campo obrigatório em falta
- `invalid_format` - Formato de dados inválido
- `value_out_of_range` - Valor fora do intervalo permitido

#### Negócio
- `insufficient_balance` - Saldo insuficiente
- `account_inactive` - Conta inativa
- `budget_exceeded` - Orçamento excedido
- `goal_already_completed` - Objetivo já concluído

---

## 🚦 Rate Limiting

### Limites por Endpoint

| Endpoint | Limite | Janela |
|----------|--------|---------|
| `/auth/*` | 10 requests | 1 minuto |
| `/transactions` | 100 requests | 1 minuto |
| `/accounts` | 50 requests | 1 minuto |
| `/goals` | 30 requests | 1 minuto |
| `/budgets` | 20 requests | 1 minuto |
| Edge Functions | 50 requests | 1 minuto |

### Headers de Rate Limit
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Resposta de Rate Limit Excedido
```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Muitas requisições. Tente novamente em 60 segundos.",
    "retry_after": 60
  }
}
```

---

## 💡 Exemplos

### Fluxo Completo: Criar Transação

```typescript
// 1. Autenticar
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// 2. Obter contas da família
const { data: accounts } = await supabase
  .from('accounts')
  .select('*')
  .eq('family_id', familyId)
  .eq('is_active', true)

// 3. Obter categorias
const { data: categories } = await supabase
  .from('categories')
  .select('*')
  .eq('family_id', familyId)
  .eq('type', 'expense')

// 4. Criar transação
const { data: transaction, error } = await supabase
  .from('transactions')
  .insert({
    account_id: accounts[0].id,
    amount: 25.50,
    type: 'expense',
    category_id: categories[0].id,
    description: 'Café da manhã',
    date: '2024-01-15'
  })
  .select()
  .single()

if (error) {
  console.error('Erro ao criar transação:', error)
} else {
  console.log('Transação criada:', transaction)
}
```

### Relatório de Gastos por Categoria

```typescript
// Query complexa com agregações
const { data: report } = await supabase
  .from('transactions')
  .select(`
    category_id,
    categories(name, color),
    amount.sum(),
    count()
  `)
  .eq('type', 'expense')
  .gte('date', '2024-01-01')
  .lte('date', '2024-01-31')
  .not('category_id', 'is', null)

// Processar resultados
const categoryReport = report?.map(item => ({
  category: item.categories.name,
  color: item.categories.color,
  total: item.sum,
  transactions: item.count
}))
```

### Subscrição Real-time com Filtros

```typescript
// Subscrever apenas transações da família atual
const subscription = supabase
  .channel(`family_${familyId}_transactions`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'transactions',
      filter: `account_id=in.(${accountIds.join(',')})`
    },
    (payload) => {
      switch (payload.eventType) {
        case 'INSERT':
          console.log('Nova transação:', payload.new)
          break
        case 'UPDATE':
          console.log('Transação atualizada:', payload.new)
          break
        case 'DELETE':
          console.log('Transação eliminada:', payload.old)
          break
      }
    }
  )
  .subscribe()
```

### Transferência entre Contas

```typescript
// Transferência com transação atômica
const { data, error } = await supabase.rpc('transfer_between_accounts', {
  from_account_id: 'uuid1',
  to_account_id: 'uuid2',
  amount: 100.00,
  description: 'Transferência para poupança'
})

if (error) {
  console.error('Erro na transferência:', error)
} else {
  console.log('Transferência realizada:', data)
}
```

---

## 🔧 Ferramentas de Desenvolvimento

### Postman Collection
Importe a collection do Postman para testar todos os endpoints:
```
https://api.postman.com/collections/porta-linda-kit
```

### OpenAPI Specification
Documentação interativa disponível em:
```
https://your-project.supabase.co/rest/v1/
```

### SDK JavaScript/TypeScript
```bash
npm install @supabase/supabase-js
```

### CLI Tools
```bash
# Supabase CLI
npm install -g supabase

# Gerar tipos TypeScript
supabase gen types typescript --project-id your-project > types/database.ts
```

---

*Última atualização: Janeiro 2025*
*Versão da API: 1.0*