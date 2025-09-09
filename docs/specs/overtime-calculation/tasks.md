# Cálculo Automático de Horas Extras - Tarefas de Implementação

## Resumo do Projeto

**Objetivo**: Implementar cálculo automático de horas extras baseado nos dados da timesheet semanal, apresentando os resultados no PayrollSummaryPage e numa página dedicada de visualização.

**Esforço Total Estimado**: 16-20 horas

**Dependências Externas**: 
- Configuração de política de horas extras
- Dados de timesheet existentes
- Calendário de feriados

## Fases de Implementação

### Fase 1: Serviço de Extração de Horas Extras (4-5 horas)

#### T1.1 - Criar OvertimeExtractionService
**Descrição**: Criar serviço para extrair e calcular horas extras da timesheet
**Requisitos**: R3.1, R3.2
**Dependências**: Nenhuma
**Estimativa**: 2 horas

**Tarefas específicas**:
- [ ] Criar `src/features/payroll/services/overtimeExtraction.service.ts`
- [ ] Implementar função `extractOvertimeFromTimesheet()`
- [ ] Implementar função `calculateOvertimeBreakdown()`
- [ ] Aplicar multiplicadores baseados na política de horas extras
- [ ] Categorizar horas extras (diurnas, noturnas, fins de semana, feriados)

#### T1.2 - Integrar com TimesheetService
**Descrição**: Conectar extração de horas extras com dados da timesheet
**Requisitos**: R3.1
**Dependências**: T1.1
**Estimativa**: 1.5 horas

**Tarefas específicas**:
- [ ] Modificar `timesheetService.ts` para incluir cálculo de horas extras
- [ ] Criar função `getTimesheetWithOvertimeCalculation()`
- [ ] Implementar cache para evitar recálculos desnecessários

#### T1.3 - Validação e Tratamento de Erros
**Descrição**: Implementar validações e tratamento de erros robusto
**Requisitos**: R3.4
**Dependências**: T1.1, T1.2
**Estimativa**: 1 hora

**Tarefas específicas**:
- [ ] Validar limites legais de horas extras
- [ ] Implementar tratamento de erros para dados inconsistentes
- [ ] Criar mensagens de aviso para limites excedidos

### Fase 2: Integração com PayrollSummaryPage (3-4 horas)

#### T2.1 - Modificar PayrollSummaryPage
**Descrição**: Integrar cálculo automático de horas extras no resumo da folha de pagamento
**Requisitos**: R3.3
**Dependências**: T1.1, T1.2
**Estimativa**: 2 horas

**Tarefas específicas**:
- [ ] Modificar `loadMonthlyTotals()` para usar dados da timesheet
- [ ] Integrar `OvertimeExtractionService` no cálculo
- [ ] Atualizar interface `MonthlyTotals` se necessário
- [ ] Garantir retrocompatibilidade com dados manuais existentes

#### T2.2 - Atualizar UI do PayrollSummary
**Descrição**: Melhorar apresentação de horas extras no resumo
**Requisitos**: R4.3
**Dependências**: T2.1
**Estimativa**: 1.5 horas

**Tarefas específicas**:
- [ ] Adicionar breakdown visual de horas extras por categoria
- [ ] Implementar tooltips explicativos para multiplicadores
- [ ] Adicionar indicadores visuais para limites excedidos
- [ ] Melhorar responsividade mobile

### Fase 3: Página Dedicada de Horas Extras (4-5 horas)

#### T3.1 - Criar OvertimeDetailPage
**Descrição**: Criar página dedicada para visualização detalhada de horas extras
**Requisitos**: R3.3, R4.3
**Dependências**: T1.1, T1.2
**Estimativa**: 3 horas

**Tarefas específicas**:
- [ ] Criar `src/features/payroll/pages/OvertimeDetailPage.tsx`
- [ ] Implementar tabela detalhada de horas extras por dia
- [ ] Adicionar filtros por período e tipo de horas extras
- [ ] Implementar gráficos de evolução mensal/anual
- [ ] Adicionar funcionalidade de exportação

#### T3.2 - Navegação e Routing
**Descrição**: Integrar nova página no sistema de navegação
**Requisitos**: R4.3
**Dependências**: T3.1
**Estimativa**: 1 hora

**Tarefas específicas**:
- [ ] Adicionar rota para `/payroll/overtime`
- [ ] Adicionar link no menu de navegação
- [ ] Adicionar botão de acesso rápido no PayrollSummaryPage

### Fase 4: Atualização do Sistema de Cálculo (3-4 horas)

#### T4.1 - Modificar calcMonth Function
**Descrição**: Atualizar função principal de cálculo para usar dados da timesheet
**Requisitos**: R3.1, R3.2, R3.3
**Dependências**: T1.1, T1.2
**Estimativa**: 2 horas

**Tarefas específicas**:
- [ ] Modificar `calc.ts` para aceitar dados pré-calculados da timesheet
- [ ] Implementar lógica de fallback para dados manuais
- [ ] Otimizar performance evitando recálculos
- [ ] Manter compatibilidade com sistema existente

#### T4.2 - Atualizar PayrollCalculationService
**Descrição**: Integrar novo fluxo no serviço principal de cálculo
**Requisitos**: R3.3
**Dependências**: T4.1
**Estimativa**: 1.5 horas

**Tarefas específicas**:
- [ ] Modificar `calculation.service.ts` para priorizar dados da timesheet
- [ ] Implementar cache inteligente
- [ ] Adicionar logs para debugging
- [ ] Atualizar documentação da API

### Fase 5: Testes e Validação (4-5 horas)

#### T5.1 - Testes Unitários
**Descrição**: Criar testes unitários para novos serviços
**Requisitos**: R4.1, R4.2
**Dependências**: T1.1, T1.2, T4.1
**Estimativa**: 2 horas

**Tarefas específicas**:
- [ ] Criar `overtimeExtraction.service.test.ts`
- [ ] Testar cálculos de horas extras com diferentes cenários
- [ ] Testar aplicação de multiplicadores
- [ ] Testar validação de limites

#### T5.2 - Testes de Integração
**Descrição**: Testar integração entre componentes
**Requisitos**: R3.1, R3.2, R3.3
**Dependências**: T2.1, T3.1, T4.2
**Estimativa**: 1.5 horas

**Tarefas específicas**:
- [ ] Testar fluxo completo: timesheet → cálculo → exibição
- [ ] Testar cenários de erro e recuperação
- [ ] Validar performance com grandes volumes de dados

#### T5.3 - Testes E2E
**Descrição**: Testes end-to-end do fluxo completo
**Requisitos**: R3.1, R3.3, R4.3
**Dependências**: T2.2, T3.2
**Estimativa**: 1 hora

**Tarefas específicas**:
- [ ] Testar inserção de horas na timesheet
- [ ] Verificar cálculo automático de horas extras
- [ ] Validar exibição no PayrollSummaryPage
- [ ] Testar navegação para página de detalhes

## Checklist de Qualidade

### Acessibilidade (WCAG 2.1 AA)
- [ ] Contraste adequado em todos os elementos visuais
- [ ] Navegação por teclado funcional
- [ ] Screen readers compatíveis
- [ ] Labels descritivos em formulários
- [ ] Foco visível em elementos interativos

### Responsividade Mobile
- [ ] Layout adaptativo para smartphones
- [ ] Touch targets adequados (min 44px)
- [ ] Scroll horizontal evitado
- [ ] Performance otimizada para dispositivos móveis

### Cross-browser
- [ ] Testado em Chrome, Firefox, Safari, Edge
- [ ] Polyfills necessários incluídos
- [ ] CSS vendor prefixes aplicados

### Performance
- [ ] Tempo de carregamento < 2s
- [ ] First Contentful Paint < 1.5s
- [ ] Bundle size otimizado
- [ ] Lazy loading implementado onde apropriado
- [ ] Cache estratégico implementado

### Segurança
- [ ] Validação de entrada implementada
- [ ] Sanitização de dados aplicada
- [ ] Controlo de acesso verificado
- [ ] Logs de auditoria implementados
- [ ] Rate limiting considerado

### Code Review
- [ ] Código revisado por peer
- [ ] Padrões de código seguidos
- [ ] Documentação atualizada
- [ ] Testes com cobertura adequada
- [ ] Performance benchmarks validados

## Riscos e Mitigações

### Risco Alto
- **Incompatibilidade com dados existentes**: Implementar fallback robusto
- **Performance degradada**: Implementar cache e otimizações

### Risco Médio
- **Complexidade de cálculos**: Dividir em funções menores e testáveis
- **UI/UX confusa**: Prototipar e testar com utilizadores

### Risco Baixo
- **Bugs em edge cases**: Cobertura de testes abrangente
- **Manutenibilidade**: Documentação clara e código limpo

## Critérios de Aceitação Final

1. ✅ Horas extras são calculadas automaticamente baseadas na timesheet
2. ✅ Multiplicadores configurados são aplicados corretamente
3. ✅ Resultados são exibidos no PayrollSummaryPage
4. ✅ Página dedicada de horas extras está funcional
5. ✅ Sistema mantém compatibilidade com dados manuais existentes
6. ✅ Performance não é degradada
7. ✅ Todos os testes passam
8. ✅ Documentação está atualizada

## Próximos Passos Após Implementação

1. **Monitorização**: Implementar métricas de uso e performance
2. **Feedback**: Recolher feedback dos utilizadores
3. **Otimização**: Identificar e implementar melhorias
4. **Expansão**: Considerar funcionalidades adicionais (relatórios, alertas)