# Cálculo Automático de Horas Extras - Design Técnico

## 1. Arquitetura Geral

### 1.1 Componentes Principais
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  WeeklyTimesheet    │───▶│  OvertimeCalculator │───▶│  PayrollCalculation │
│  Form               │    │  Service            │    │  Service            │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  PayrollTimeEntry   │    │  OvertimePolicy     │    │  MonthlyTotals      │
│  (Database)         │    │  (Configuration)    │    │  (UI Display)       │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### 1.2 Fluxo de Dados
1. **Entrada**: Utilizador insere horas na `WeeklyTimesheetForm`
2. **Processamento**: `OvertimeCalculator` calcula horas extras com multiplicadores
3. **Armazenamento**: Dados são salvos como `PayrollTimeEntry`
4. **Cálculo**: `PayrollCalculationService` usa dados para calcular folha de pagamento
5. **Exibição**: `PayrollSummaryPage` mostra totais categorizados

## 2. Modelos de Dados

### 2.1 Extensão do PayrollTimeEntry
```typescript
interface PayrollTimeEntry {
  // Campos existentes...
  id: string;
  contract_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  break_minutes?: number;
  
  // Novos campos para horas extras calculadas
  calculated_regular_hours?: number;
  calculated_overtime_hours?: number;
  overtime_breakdown?: {
    day: number;      // Horas extras diurnas
    night: number;    // Horas extras noturnas
    weekend: number;  // Horas extras fim de semana
    holiday: number;  // Horas extras feriados
  };
  overtime_multipliers_applied?: {
    day: number;
    night: number;
    weekend: number;
    holiday: number;
  };
}
```

### 2.2 Configuração de Política de Horas Extras
```typescript
interface OvertimePolicy {
  id: string;
  contract_id: string;
  
  // Limites
  daily_limit_hours: number;     // Ex: 8 horas
  weekly_limit_hours: number;    // Ex: 40 horas
  annual_limit_hours: number;    // Ex: 200 horas
  
  // Multiplicadores
  multipliers: {
    day: number;      // Ex: 1.25 (25% extra)
    night: number;    // Ex: 1.5 (50% extra)
    weekend: number;  // Ex: 1.5 (50% extra)
    holiday: number;  // Ex: 2.0 (100% extra)
  };
  
  // Horários
  night_start_hour: number;  // Ex: 22 (22:00)
  night_end_hour: number;    // Ex: 6 (06:00)
  
  created_at: string;
  updated_at: string;
}
```

## 3. Serviços e Funções

### 3.1 OvertimeCalculatorService
```typescript
class OvertimeCalculatorService {
  /**
   * Calcula horas extras para uma entrada de timesheet
   */
  calculateOvertimeForEntry(
    entry: TimesheetEntry,
    policy: OvertimePolicy,
    weeklyHours: number,
    isHoliday: boolean
  ): OvertimeCalculation {
    // 1. Calcular total de horas trabalhadas
    const totalHours = this.calculateTotalHours(entry);
    
    // 2. Determinar horas regulares vs extras
    const { regular, overtime } = this.segmentHours(
      totalHours, 
      policy.daily_limit_hours,
      weeklyHours,
      policy.weekly_limit_hours
    );
    
    // 3. Categorizar horas extras por tipo
    const breakdown = this.categorizeOvertime(
      entry,
      overtime,
      policy,
      isHoliday
    );
    
    // 4. Aplicar multiplicadores
    const multipliedBreakdown = this.applyMultipliers(
      breakdown,
      policy.multipliers
    );
    
    return {
      regular_hours: regular,
      overtime_hours: overtime,
      breakdown,
      multiplied_breakdown: multipliedBreakdown
    };
  }
  
  /**
   * Categoriza horas extras por tipo (diurno, noturno, fim de semana, feriado)
   */
  private categorizeOvertime(
    entry: TimesheetEntry,
    overtimeHours: number,
    policy: OvertimePolicy,
    isHoliday: boolean
  ): OvertimeBreakdown {
    const startTime = parseTime(entry.start_time);
    const endTime = parseTime(entry.end_time);
    const dayOfWeek = new Date(entry.date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Lógica para determinar que parte das horas extras
    // são diurnas, noturnas, fim de semana ou feriado
    
    return {
      day: isHoliday || isWeekend ? 0 : this.calculateDayOvertime(startTime, endTime, policy),
      night: this.calculateNightOvertime(startTime, endTime, policy),
      weekend: isWeekend && !isHoliday ? overtimeHours : 0,
      holiday: isHoliday ? overtimeHours : 0
    };
  }
}
```

### 3.2 Integração com WeeklyTimesheetForm
```typescript
// Modificações no WeeklyTimesheetForm.tsx

const WeeklyTimesheetForm = ({ contractId, weekStart }: Props) => {
  const [overtimeCalculator] = useState(() => new OvertimeCalculatorService());
  const [overtimePolicy, setOvertimePolicy] = useState<OvertimePolicy | null>(null);
  
  // Carregar política de horas extras
  useEffect(() => {
    const loadOvertimePolicy = async () => {
      const policy = await payrollService.getOvertimePolicy(contractId);
      setOvertimePolicy(policy);
    };
    loadOvertimePolicy();
  }, [contractId]);
  
  // Calcular horas extras em tempo real
  const calculateOvertimeForEntry = useCallback((entry: TimesheetEntry) => {
    if (!overtimePolicy) return null;
    
    const weeklyHours = calculateWeeklyHours(entries);
    const isHoliday = holidays.some(h => h.date === entry.date);
    
    return overtimeCalculator.calculateOvertimeForEntry(
      entry,
      overtimePolicy,
      weeklyHours,
      isHoliday
    );
  }, [overtimePolicy, entries, holidays]);
  
  // Atualizar entrada com cálculo de horas extras
  const handleEntryChange = useCallback((index: number, field: string, value: any) => {
    const updatedEntries = [...entries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    
    // Calcular horas extras para a entrada modificada
    if (field === 'start_time' || field === 'end_time' || field === 'break_minutes') {
      const overtimeCalc = calculateOvertimeForEntry(updatedEntries[index]);
      if (overtimeCalc) {
        updatedEntries[index].calculated_overtime = overtimeCalc;
      }
    }
    
    setEntries(updatedEntries);
  }, [entries, calculateOvertimeForEntry]);
};
```

### 3.3 Integração com PayrollCalculationService
```typescript
// Modificações no calculation.service.ts

export class PayrollCalculationService {
  async calculate(
    contractId: string,
    month: number,
    year: number
  ): Promise<PayrollCalculationResult> {
    // ... código existente ...
    
    // Buscar entradas de timesheet com horas extras calculadas
    const timesheetEntries = await this.getTimesheetEntriesWithOvertime(
      contractId,
      month,
      year
    );
    
    // Se existem entradas de timesheet, usar essas em vez de PayrollTimeEntry manuais
    const timeEntries = timesheetEntries.length > 0 
      ? this.convertTimesheetToPayrollEntries(timesheetEntries)
      : await payrollService.getTimeEntriesByContract(contractId, month, year);
    
    // ... resto do cálculo ...
  }
  
  private async getTimesheetEntriesWithOvertime(
    contractId: string,
    month: number,
    year: number
  ): Promise<TimesheetEntryWithOvertime[]> {
    // Buscar entradas de timesheet que já têm horas extras calculadas
    return await timesheetService.getEntriesWithCalculatedOvertime(
      contractId,
      month,
      year
    );
  }
  
  private convertTimesheetToPayrollEntries(
    timesheetEntries: TimesheetEntryWithOvertime[]
  ): PayrollTimeEntry[] {
    return timesheetEntries.map(entry => ({
      id: entry.id,
      contract_id: entry.contract_id,
      date: entry.date,
      start_time: entry.start_time,
      end_time: entry.end_time,
      break_minutes: entry.break_minutes,
      // Usar horas extras já calculadas
      calculated_regular_hours: entry.calculated_overtime?.regular_hours,
      calculated_overtime_hours: entry.calculated_overtime?.overtime_hours,
      overtime_breakdown: entry.calculated_overtime?.breakdown,
      overtime_multipliers_applied: entry.calculated_overtime?.multiplied_breakdown
    }));
  }
}
```

## 4. Migrações de Base de Dados

### 4.1 Extensão da tabela PayrollTimeEntry
```sql
-- Migration: add_overtime_calculation_fields
ALTER TABLE payroll_time_entries 
ADD COLUMN calculated_regular_hours DECIMAL(5,2),
ADD COLUMN calculated_overtime_hours DECIMAL(5,2),
ADD COLUMN overtime_breakdown JSONB,
ADD COLUMN overtime_multipliers_applied JSONB;

-- Índices para performance
CREATE INDEX idx_payroll_time_entries_calculated_overtime 
ON payroll_time_entries(contract_id, date) 
WHERE calculated_overtime_hours > 0;
```

### 4.2 Tabela de Política de Horas Extras
```sql
-- Migration: create_overtime_policies
CREATE TABLE overtime_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Limites
  daily_limit_hours DECIMAL(4,2) NOT NULL DEFAULT 8.00,
  weekly_limit_hours DECIMAL(5,2) NOT NULL DEFAULT 40.00,
  annual_limit_hours DECIMAL(6,2) NOT NULL DEFAULT 200.00,
  
  -- Multiplicadores
  multipliers JSONB NOT NULL DEFAULT '{
    "day": 1.25,
    "night": 1.5,
    "weekend": 1.5,
    "holiday": 2.0
  }',
  
  -- Horários
  night_start_hour INTEGER NOT NULL DEFAULT 22,
  night_end_hour INTEGER NOT NULL DEFAULT 6,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id)
);

-- RLS Policy
ALTER TABLE overtime_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own overtime policies" ON overtime_policies
FOR ALL USING (
  contract_id IN (
    SELECT id FROM contracts WHERE user_id = auth.uid()
  )
);
```

## 5. Contratos de API

### 5.1 Endpoint para Cálculo de Horas Extras
```typescript
// POST /api/payroll/calculate-overtime
interface CalculateOvertimeRequest {
  contract_id: string;
  entries: TimesheetEntry[];
}

interface CalculateOvertimeResponse {
  success: boolean;
  data: {
    entries: TimesheetEntryWithOvertime[];
    weekly_totals: {
      regular_hours: number;
      overtime_hours: number;
      overtime_breakdown: OvertimeBreakdown;
    };
    warnings: string[];  // Ex: "Limite semanal excedido"
  };
  error?: string;
}
```

### 5.2 Endpoint para Política de Horas Extras
```typescript
// GET /api/payroll/overtime-policy/:contractId
interface GetOvertimePolicyResponse {
  success: boolean;
  data: OvertimePolicy | null;
  error?: string;
}

// PUT /api/payroll/overtime-policy/:contractId
interface UpdateOvertimePolicyRequest {
  daily_limit_hours: number;
  weekly_limit_hours: number;
  annual_limit_hours: number;
  multipliers: {
    day: number;
    night: number;
    weekend: number;
    holiday: number;
  };
  night_start_hour: number;
  night_end_hour: number;
}
```

## 6. Tratamento de Erros

### 6.1 Validações
- **Entrada inválida**: Horas de início/fim inconsistentes
- **Limites excedidos**: Validação de limites legais
- **Configuração em falta**: Política de horas extras não configurada
- **Sobreposição**: Entradas de tempo sobrepostas

### 6.2 Estados de Erro
```typescript
interface OvertimeCalculationError {
  type: 'INVALID_INPUT' | 'LIMIT_EXCEEDED' | 'MISSING_CONFIG' | 'OVERLAP';
  message: string;
  field?: string;
  suggested_action?: string;
}
```

## 7. Testes

### 7.1 Testes Unitários
- `OvertimeCalculatorService.test.ts`
- `WeeklyTimesheetForm.overtime.test.tsx`
- `PayrollCalculationService.overtime.test.ts`

### 7.2 Testes de Integração
- Fluxo completo: timesheet → cálculo → payroll
- Validação de limites legais
- Aplicação correta de multiplicadores

### 7.3 Testes E2E
- Utilizador insere horas na timesheet
- Sistema calcula horas extras automaticamente
- Valores aparecem corretamente no PayrollSummary

## 8. Performance e Caching

### 8.1 Otimizações
- Cache de políticas de horas extras
- Cálculo incremental (apenas entradas modificadas)
- Debounce em mudanças de timesheet

### 8.2 Monitorização
- Tempo de cálculo de horas extras
- Frequência de recálculos
- Erros de validação

## 9. Segurança

### 9.1 Validação de Entrada
- Sanitização de horas inseridas
- Validação de ranges de tempo
- Prevenção de manipulação de multiplicadores

### 9.2 Auditoria
- Log de alterações em horas extras
- Rastreamento de quem modificou configurações
- Histórico de cálculos realizados