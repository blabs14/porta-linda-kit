import { OvertimeExtractionService } from './src/features/payroll/services/overtimeExtraction.service.js';

const mockPolicy = {
  id: 'test-policy',
  user_id: 'test-user',
  name: 'Test Policy',
  threshold_hours: 8,
  multiplier: 1.5,
  daily_limit_hours: 12,
  annual_limit_hours: 150,
  weekly_limit_hours: 48,
  day_multiplier: 1.5,
  night_multiplier: 1.75,
  weekend_multiplier: 2.0,
  holiday_multiplier: 2.0,
  night_start_time: '22:00',
  night_end_time: '06:00',
  rounding_minutes: 15,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const service = new OvertimeExtractionService(mockPolicy);

// Teste simples com uma entrada
const entries = [{
  date: '2024-01-15',
  startTime: '09:00',
  endTime: '19:00', // 10 horas - 1 hora de pausa = 9 horas (1 hora extra)
  breakMinutes: 60,
  description: 'Trabalho teste',
  isHoliday: false,
  isSick: false,
  isVacation: false,
  isException: false
}];

console.log('Entrada:', entries[0]);
console.log('Policy:', mockPolicy);

const result = service.extractOvertimeFromTimesheet(entries);
console.log('Resultado completo:', JSON.stringify(result, null, 2));
console.log('totalOvertimeHours:', result.totalOvertimeHours);
console.log('Tipo de totalOvertimeHours:', typeof result.totalOvertimeHours);