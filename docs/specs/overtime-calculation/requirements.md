# Cálculo Automático de Horas Extras - Requisitos

## 1. Introdução

### 1.1 Objetivo
Implementar o cálculo automático de horas extras baseado nas entradas da timesheet semanal, utilizando os multiplicadores definidos na página de configurações de horas extras.

### 1.2 Valor de Negócio
- Automatizar o processo de cálculo de horas extras
- Reduzir erros manuais no cálculo de folha de pagamento
- Garantir consistência entre timesheet e cálculos de payroll
- Aplicar corretamente os multiplicadores configurados

### 1.3 Escopo
- Integração entre WeeklyTimesheetForm e sistema de payroll
- Aplicação automática de políticas de horas extras
- Cálculo de diferentes tipos de horas extras (diurnas, noturnas, fins de semana, feriados)

## 2. Fluxo Atual (Estado Presente)

### 2.1 Entrada de Horas na Timesheet
- Utilizador insere horas na `WeeklyTimesheetForm`
- Sistema calcula breakdown de horas (regulares vs extras)
- Entradas são convertidas para `PayrollTimeEntry` via `createTimeEntry`
- Dados são armazenados na base de dados

### 2.2 Cálculo de Payroll
- `PayrollSummaryPage` chama `calculatePayroll` do `calculation.service.ts`
- Serviço busca `PayrollTimeEntry` existentes
- Função `calcMonth` processa entradas e aplica multiplicadores
- Resultado inclui categorias: `overtimePayDay`, `overtimePayNight`, `overtimePayWeekend`, `overtimePayHoliday`

### 2.3 Configuração de Multiplicadores
- Página de configurações permite definir multiplicadores para diferentes tipos de horas extras
- Multiplicadores são armazenados na política de horas extras (`OvertimePolicy`)

## 3. Requisitos Funcionais

### 3.1 Cálculo Automático na Timesheet (R3.1)
**User Story**: Como utilizador, quero que as horas extras sejam calculadas automaticamente quando insiro horas na timesheet, para que não tenha que calcular manualmente.

**Acceptance Criteria**:
- WHEN o utilizador insere horas de trabalho na timesheet
- AND as horas excedem o limite diário/semanal configurado
- THEN o sistema SHALL calcular automaticamente as horas extras
- AND aplicar os multiplicadores definidos na configuração

### 3.2 Aplicação de Multiplicadores (R3.2)
**User Story**: Como utilizador, quero que os multiplicadores configurados sejam aplicados automaticamente às horas extras, para garantir cálculos corretos.

**Acceptance Criteria**:
- WHEN horas extras são calculadas
- THEN o sistema SHALL aplicar multiplicadores baseados em:
  - Horário (diurno vs noturno)
  - Dia da semana (normal vs fim de semana)
  - Tipo de dia (normal vs feriado)
- AND usar os valores definidos na página de configurações

### 3.3 Integração com Payroll (R3.3)
**User Story**: Como utilizador, quero que as horas extras da timesheet sejam automaticamente incluídas no cálculo da folha de pagamento.

**Acceptance Criteria**:
- WHEN o cálculo de payroll é executado
- THEN o sistema SHALL usar as horas extras calculadas na timesheet
- AND categorizar por tipo (diurnas, noturnas, fins de semana, feriados)
- AND incluir no total da folha de pagamento

### 3.4 Validação de Limites (R3.4)
**User Story**: Como utilizador, quero que o sistema valide os limites legais de horas extras, para garantir conformidade.

**Acceptance Criteria**:
- WHEN horas extras são calculadas
- THEN o sistema SHALL validar limites semanais e anuais
- AND exibir avisos quando limites são excedidos
- AND permitir override com justificação

## 4. Requisitos Não-Funcionais

### 4.1 Performance (R4.1)
- Cálculos devem ser executados em tempo real (<500ms)
- Cache de resultados para evitar recálculos desnecessários

### 4.2 Segurança (R4.2)
- Validação de entrada para prevenir manipulação de dados
- Auditoria de alterações em horas extras
- Controlo de acesso baseado em roles

### 4.3 Usabilidade (R4.3)
- Interface clara mostrando breakdown de horas
- Feedback visual para horas extras calculadas
- Tooltips explicando multiplicadores aplicados

## 5. Casos Extremos

### 5.1 Dados Inconsistentes
- Timesheet com horas sobrepostas
- Configurações de multiplicadores inválidas
- Entradas de tempo em feriados não configurados

### 5.2 Limites Excedidos
- Horas extras semanais acima do limite legal
- Horas extras anuais acima do limite legal
- Trabalho em domingos consecutivos

### 5.3 Configurações em Falta
- Política de horas extras não configurada
- Multiplicadores não definidos
- Horário de trabalho não configurado

## 6. Dependências

### 6.1 Componentes Existentes
- `WeeklyTimesheetForm` - entrada de horas
- `calculation.service.ts` - cálculo de payroll
- `calc.ts` - lógica de cálculo de horas extras
- `payrollService.ts` - gestão de PayrollTimeEntry

### 6.2 Configurações
- `OvertimePolicy` - multiplicadores e limites
- `Contract` - horário de trabalho base
- Calendário de feriados

### 6.3 Base de Dados
- Tabela de PayrollTimeEntry
- Tabela de configurações de horas extras
- Tabela de contratos