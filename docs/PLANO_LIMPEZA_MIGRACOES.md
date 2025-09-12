# Plano de Limpeza das Migrações - Family Flow Finance

## Análise Completa das Migrações

### Estado Atual
O projeto possui **33 migrações** no total, com várias redundâncias e correções incrementais que podem ser consolidadas.

## Classificação das Migrações

### ✅ MANTER - Migrações Essenciais (16 migrações)

#### 1. Schema Base
- `20250807000000_initial_schema.sql` - **ESSENCIAL** - Schema inicial completo
- `20250809000100_enhanced_backend.sql` - **MANTER** - Melhorias no backend
- `20250809001000_regular_account_functions.sql` - **MANTER** - Funções de contas regulares
- `20250809002000_auth_profiles_trigger.sql` - **MANTER** - Triggers de autenticação

#### 2. Funcionalidades Core
- `20250809008000_accounts_balances_rpc.sql` - **MANTER** - RPCs de saldos
- `20250814010000_balances_ignore_transfers.sql` - **MANTER** - Correção importante de saldos
- `20250810000350_remote_hotfix_transfer.sql` - **MANTER** - Hotfix crítico

#### 3. Funcionalidades Avançadas
- `20250812010000_recurring.sql` - **MANTER** - Transações recorrentes
- `20250812010100_scheduler_recurrents.sql` - **MANTER** - Agendador de recorrentes
- `20250812010200_recurring_actions.sql` - **MANTER** - Ações recorrentes
- `20250814020000_goal_funding.sql` - **MANTER** - Financiamento de objetivos
- `20250820000003_fix_goal_funding_exclude_transfers.sql` - **MANTER** - Correção importante

#### 4. Importador Universal
- `20250812020000_importer.sql` - **MANTER** - Schema do importador
- `20250812030000_importer_phase1.sql` - **MANTER** - Fase 1 do importador

#### 5. Moedas e Cartões de Crédito
- `20250820000002_currencies_table.sql` - **MANTER** - Suporte multi-moeda
- `20250808012000_credit_card_functions.sql` - **MANTER** - Funcionalidades ativas

### 🔄 CONSOLIDAR - Migrações Redundantes (8 migrações → 3 migrações)

#### Grupo 1: Correções de Saldo (5 → 1)
**PROBLEMA**: 5 migrações fazem correções incrementais do mesmo problema
- `20250809003000_fix_regular_account_balance.sql` ❌ REMOVER
- `20250809004000_set_regular_balance_direct.sql` ❌ REMOVER  
- `20250809005000_set_regular_balance_adjust_diff.sql` ❌ REMOVER
- `20250809006000_balance_normalization.sql` ❌ REMOVER
- `20250809007000_fix_set_balance_tx_only.sql` ❌ REMOVER

**SOLUÇÃO**: Criar `20250809999000_balance_fixes_consolidated.sql` com a versão final

#### Grupo 2: Remote Schema (2 → 1)
**PROBLEMA**: Duas migrações remote_schema consecutivas
- `20250808001746_remote_schema.sql` ❌ REMOVER (6295 linhas - schema completo)
- `20250808002216_remote_schema.sql` ❌ REMOVER (115 linhas - correções de políticas)

**SOLUÇÃO**: Criar `20250808999000_remote_schema_consolidated.sql`
**ANÁLISE**: A primeira migração cria tabelas extensas, a segunda corrige políticas RLS

#### Grupo 3: Account Reserve (2 → 1)
**PROBLEMA**: Duas migrações para a mesma funcionalidade
- `20250820000000_account_reserve_settings.sql` ❌ REMOVER
- `20250820000001_update_account_reserved_view.sql` ❌ REMOVER
- `20250820000001_update_account_reserved_view_fixed.sql` ❌ REMOVER

**SOLUÇÃO**: Criar `20250820999000_account_reserve_consolidated.sql`

### ❓ AVALIAR - Migrações Questionáveis (10 migrações)

#### RLS e Família
- `20250812000100_rls_fix_family_members.sql` - **AVALIAR** - Pode ser consolidado
- `20250812000200_rls_notifications_refactor.sql` - **AVALIAR** - Pode ser consolidado
- `20250812000300_rls_family_entities_refactor.sql` - **AVALIAR** - Pode ser consolidado
- `20250812000400_rls_core_family_entities_refactor.sql` - **AVALIAR** - Pode ser consolidado
- `20250812000500_rpcs_membership_helpers.sql` - **AVALIAR** - Pode ser consolidado
- `20250812000600_rls_reminders_auditlogs_refactor.sql` - **AVALIAR** - Pode ser consolidado

#### Notificações e KPIs
- `20250810000100_push_subscriptions.sql` - **AVALIAR** - Funcionalidade usada?
- `20250810000200_schedule_reminders_push.sql` - **AVALIAR** - Funcionalidade usada?
- `20250810000300_create_reminders.sql` - **AVALIAR** - Funcionalidade usada?
- `20250811000100_family_kpis_and_breakdown.sql` - **AVALIAR** - Funcionalidade usada?

#### Cartão de Crédito
- `20250808012000_credit_card_functions.sql` - **MANTER** - Funcionalidade ativa no código
  - ✅ Funções usadas em `accounts.ts`, `transactions.ts`, `TransferModal.tsx`
  - ✅ Componentes `CreditCardInfo`, `CreditCardForm`, `CreditCardBalance` ativos
  - ✅ UI parcialmente comentada mas funcionalidade core implementada

## Plano de Execução

### Fase 1: Consolidação Crítica
1. ✅ Consolidar correções de saldo (5 → 1)
2. ✅ Consolidar remote_schema (2 → 1) 
3. ✅ Consolidar account_reserve (3 → 1)

### Fase 2: Avaliação de Funcionalidades
1. 🔍 Verificar uso real das funcionalidades RLS
2. 🔍 Verificar uso das notificações push
3. 🔍 Decidir sobre cartão de crédito

### Fase 3: Limpeza Final
1. 🗑️ Remover migrações obsoletas
2. 📝 Atualizar documentação
3. ✅ Testar schema final

## Resultado Esperado

**Antes**: 33 migrações  
**Depois**: ~21-23 migrações (-30% redução)

### Benefícios
- ✅ Schema mais limpo e compreensível
- ✅ Menos conflitos em merges
- ✅ Deploy mais rápido
- ✅ Manutenção simplificada
- ✅ Onboarding de novos devs mais fácil

## Conclusões da Análise

### ✅ Análise Completa
- **33 migrações** analisadas individualmente
- **Funcionalidades ativas** identificadas e preservadas
- **Redundâncias críticas** mapeadas para consolidação
- **Cartão de crédito** confirmado como funcionalidade ativa

### 🎯 Consolidações Prioritárias
1. **5 migrações de saldo** → 1 migração consolidada
2. **2 migrações remote_schema** → 1 migração consolidada  
3. **3 migrações account_reserve** → 1 migração consolidada

## Próximos Passos

1. **Aprovação do plano** pelo utilizador
2. **Backup** do estado atual
3. **Execução** das consolidações
4. **Testes** do schema final
5. **Documentação** das mudanças

---

*Documento gerado em: Janeiro 2025*  
*Versão: 1.0*