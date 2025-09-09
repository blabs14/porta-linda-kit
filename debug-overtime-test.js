import { createOvertimeExtractionService } from './src/features/payroll/services/overtimeExtraction.service.ts';

// Política de teste
const mockPolicy = {
  id: '1',
  user_id: 'user-1',
  name: 'Política Padrão',
  threshold_hours: 8,
  multiplier: 1.5,
  daily_limit_hours: 12,
  annual_limit_hours: 150,
  weekly_limit_hours: 48,
  day_multiplier: 1.5,
  night_multiplier: 2.0,
  weekend_multiplier: 2.0,
  holiday_multiplier: 2.5,
  night_start_time: '22:00',
  night_end_time: '06:00',
  rounding_minutes: 15,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Entrada de teste
const entries = [
  {
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '17:10', // 8h10min - 1h pausa = 7h10min
    breakMinutes: 60,
    description: 'Trabalho com minutos extras',
    isHoliday: false,
    isSick: false
  }
];

console.log('=== DEBUG OVERTIME CALCULATION ===');
console.log('Policy threshold_hours:', mockPolicy.threshold_hours);
console.log('Policy rounding_minutes:', mockPolicy.rounding_minutes);
console.log('');
console.log('Entry details:');
console.log('- Start time:', entries[0].startTime);
console.log('- End time:', entries[0].endTime);
console.log('- Break minutes:', entries[0].breakMinutes);
console.log('');

// Calcular manualmente
const startTime = new Date(`1970-01-01T${entries[0].startTime}`);
const endTime = new Date(`1970-01-01T${entries[0].endTime}`);
const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
const workingMinutes = totalMinutes - entries[0].breakMinutes;
const workingHours = workingMinutes / 60;

console.log('Manual calculation:');
console.log('- Total minutes:', totalMinutes);
console.log('- Working minutes:', workingMinutes);
console.log('- Working hours:', workingHours);
console.log('- Overtime hours (before rounding):', Math.max(0, workingHours - mockPolicy.threshold_hours));
console.log('');

// Testar com o serviço
try {
  const service = createOvertimeExtractionService(1500, mockPolicy, []); // 15.00 euros por hora
  const result = service.extractOvertimeFromTimesheet(entries);
  
  console.log('Service result:');
  console.log('- Total overtime hours:', result.totalOvertimeHours);
  console.log('- Daily breakdown:', result.dailyBreakdown);
  console.log('- Warnings:', result.warnings);
} catch (error) {
  console.error('Error:', error.message);
}