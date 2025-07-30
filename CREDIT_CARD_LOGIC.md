# Lógica de Cartões de Crédito

## Como funcionam as transações para cartões de crédito

### 1. **Conceito Base**
- **Saldo negativo** = Dívida no cartão
- **Saldo positivo** = Crédito disponível
- **Saldo zero** = Cartão sem dívida

### 2. **Tipos de Transação**

#### **Despesas (Gastos)**
- **Ação**: Aumentam a dívida
- **Cálculo**: `saldo_atual = saldo_atual - valor`
- **Exemplo**: 
  - Saldo atual: -100€
  - Gasto: 50€
  - Novo saldo: -150€ (mais dívida)

#### **Receitas (Pagamentos)**
- **Ação**: Diminuem a dívida
- **Cálculo**: `saldo_atual = saldo_atual + valor`
- **Exemplo**:
  - Saldo atual: -150€
  - Pagamento: 200€
  - Novo saldo: +50€ (sem dívida, com crédito disponível)

### 3. **Funcionalidades Implementadas**

#### **Criação de Conta**
- Saldo inicial sempre 0€ (mesmo que o utilizador introduza outro valor)
- Aplicação automática da lógica específica de cartão de crédito

#### **Transações**
- **Função RPC**: `handle_credit_card_transaction`
- **Lógica específica**: Diferencia entre despesas e receitas
- **Atualização automática**: Saldo da conta atualizado automaticamente

#### **Resumo de Cartão**
- **Função RPC**: `get_credit_card_summary`
- **Informações mostradas**:
  - Status (Em dívida/Sem dívida)
  - Dívida atual (se aplicável)
  - Total de gastos
  - Total de pagamentos
  - Avisos quando em dívida

### 4. **Interface do Utilizador**

#### **Formulário de Criação**
- Mensagem informativa sobre como funcionam cartões de crédito
- Placeholder específico para saldo inicial
- Validação automática do saldo

#### **Cards de Conta**
- Seção específica para cartões de crédito
- Ícone de cartão de crédito
- Informações detalhadas sobre dívida e gastos
- Avisos visuais quando em dívida

### 5. **Exemplos Práticos**

#### **Cenário 1: Cartão novo**
```
Saldo inicial: 0€
Gasto: 100€ → Saldo: -100€ (dívida)
Pagamento: 100€ → Saldo: 0€ (sem dívida)
```

#### **Cenário 2: Cartão com dívida**
```
Saldo atual: -200€
Gasto: 50€ → Saldo: -250€ (mais dívida)
Pagamento: 300€ → Saldo: +50€ (sem dívida, com crédito)
```

#### **Cenário 3: Cartão com crédito**
```
Saldo atual: +100€
Gasto: 50€ → Saldo: +50€ (menos crédito)
Gasto: 100€ → Saldo: -50€ (agora em dívida)
```

### 6. **Vantagens da Implementação**

1. **Clareza**: Saldo negativo = dívida, positivo = crédito
2. **Automatização**: Lógica aplicada automaticamente
3. **Transparência**: Utilizador vê sempre o estado real do cartão
4. **Flexibilidade**: Suporta tanto dívidas como crédito disponível
5. **Consistência**: Mesma lógica aplicada em todas as transações

### 7. **Considerações Futuras**

- **Limite de crédito**: Pode ser adicionado como campo opcional
- **Data de vencimento**: Para lembretes de pagamento
- **Taxas de juros**: Para cálculo de dívida acumulada
- **Histórico de faturas**: Para acompanhamento mensal 