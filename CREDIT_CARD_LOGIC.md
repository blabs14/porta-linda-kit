# Lógica de Cartões de Crédito - Documentação

## 📋 **Estado Atual**
- ✅ **Comentado**: Todas as funções e componentes relacionados com cartões de crédito foram comentados
- ✅ **Limpo**: Base de dados limpa de transações de teste
- ✅ **Pronto**: Para implementar mais tarde com uma abordagem mais robusta

## 🎯 **Lógica Desenvolvida**

### **Princípios Fundamentais:**
1. **Saldo Total**: Sempre ≤ 0 (negativo ou zero)
2. **Quando aumenta dívida**: Aumenta os gastos
3. **Quando diminui dívida**: Aumenta os pagamentos
4. **Quando saldo = 0**: Tudo zerado, novo ciclo limpo

### **Exemplos de Comportamento:**
```
Estado 1: 0€ → 400€ (input)
- Saldo Total: -400€
- Total Gastos: 400€
- Total Pagamentos: 0€

Estado 2: -400€ → 300€ (input)
- Saldo Total: -300€
- Total Gastos: 400€ (mantido)
- Total Pagamentos: 100€ (aumentado)

Estado 3: -300€ → 0€ (input)
- Saldo Total: 0€
- Total Gastos: 0€ (reset)
- Total Pagamentos: 0€ (reset)
- Histórico: Limpo (novo ciclo)
```

## 🔧 **Funções Desenvolvidas (Comentadas)**

### **1. manage_credit_card_balance**
- **Propósito**: Gerir saldo de cartões de crédito
- **Lógica**: 
  - Converte valores positivos para negativos
  - Quando saldo = 0: limpa tudo e inicia novo ciclo
  - Quando aumenta dívida: aumenta gastos
  - Quando diminui dívida: aumenta pagamentos

### **2. get_credit_card_summary**
- **Propósito**: Obter resumo de cartão de crédito
- **Retorna**: Saldo, gastos, pagamentos, status

## 🎨 **Componentes Desenvolvidos (Comentados)**

### **1. CreditCardBalance**
- **Propósito**: Mostrar saldo de cartão de crédito
- **Características**: Sempre mostra saldo negativo em vermelho

### **2. CreditCardInfo**
- **Propósito**: Mostrar informações detalhadas
- **Inclui**: Status, total gastos, total pagamentos

## 📁 **Ficheiros Modificados**

### **Comentados:**
- `src/services/accounts.ts` - Lógica especializada
- `src/hooks/useAccountsQuery.ts` - Hook useCreditCardSummary
- `src/pages/accounts.tsx` - Componentes específicos
- `src/integrations/supabase/database.types.ts` - Tipos TypeScript
- `src/components/AccountForm.tsx` - Opção "cartão de crédito" no formulário
- `src/services/transactions.ts` - Lógica específica para transações de cartão de crédito

### **Base de Dados:**
- `manage_credit_card_balance` - Função comentada
- `get_credit_card_summary` - Função comentada

## 🚀 **Próximos Passos (Quando Implementar)**

### **1. Descomentar e Testar**
```bash
# Descomentar funções na base de dados
# Descomentar tipos TypeScript
# Descomentar serviços e hooks
# Descomentar componentes
```

### **2. Melhorias Sugeridas**
- **Validação**: Verificar se conta é realmente cartão de crédito
- **Logs**: Adicionar logs detalhados para debugging
- **Testes**: Criar testes unitários para a lógica
- **UI**: Melhorar interface para cartões de crédito

### **3. Cenários de Teste**
- [ ] 0€ → 400€ → 300€ → 0€
- [ ] 0€ → 500€ → 200€ → 100€
- [ ] 0€ → 1000€ → 0€ (reset)
- [ ] Valores negativos diretos
- [ ] Valores positivos (conversão automática)

## 💡 **Lições Aprendidas**

1. **Lógica Simples**: Manter a lógica o mais simples possível
2. **Reset Completo**: Quando saldo = 0, limpar tudo
3. **Consistência**: Manter gastos e pagamentos consistentes
4. **Testes**: Testar cada cenário antes de avançar

## 🔍 **Problemas Resolvidos**

1. **Conversão de Valores**: Valores positivos convertidos para negativos
2. **Cálculo de Totais**: Lógica para aumentar gastos vs pagamentos
3. **Reset de Ciclo**: Limpeza completa quando saldo = 0
4. **Consistência de Dados**: Totais sempre alinhados com saldo

---
*Documentação criada em 31/07/2025*
*Pronto para implementação futura* 