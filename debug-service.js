// Debug do serviço de horas extras
import { OvertimeExtractionService } from './src/features/payroll/services/overtimeExtraction.service.ts';

// Mock da política
const mockPolicy = {
  threshold_hours: 8,
  day_multiplier: 1.5,
  night_multiplier: 2.0,
  weekend_multiplier: 2.0,
  holiday_multiplier: 2.5,
  daily_limit_hours: 4,
  weekly_limit_hours: 48,
  annual_limit_hours: 200,
  night_start_time: '22:00',
  night_end_time: '06:00',
  rounding_minutes: 15
};

// Criar instância do serviço
const service = new OvertimeExtractionService(mockPolicy, [], 1500);

// Entrada de teste - trabalho que cruza meia-noite
const testEntry = {
  date: '2024-01-15',
  startTime: '22:00',
  endTime: '08:00', // 10 horas totais
  breakMinutes: 0,
  description: 'Teste overtime que cruza meia-noite',
  isHoliday: false,
  isVacation: false,
  isLeave: false,
  isSick: false,
  isException: false
};

console.log('Testando entrada:', testEntry);

// Testar cálculo de minutos de trabalho diretamente
const startTime = new Date(`${testEntry.date}T${testEntry.startTime}`);
let endTime = new Date(`${testEntry.date}T${testEntry.endTime}`);
if (endTime < startTime) {
  endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000); // Adicionar 1 dia
}
const totalMinutes = (endTime - startTime) / (1000 * 60);
const workingMinutes = totalMinutes - testEntry.breakMinutes;
const totalHours = workingMinutes / 60;

console.log('Cálculo manual:', {
  startTime: startTime.toISOString(),
  endTime: endTime.toISOString(),
  totalMinutes,
  workingMinutes,
  totalHours,
  threshold: mockPolicy.threshold_hours
});

// Testar o serviço
try {
  // Adicionar logs de debug temporários
  const originalCategorize = service.categorizeOvertimeByTime;
  service.categorizeOvertimeByTime = function(entry, overtimeHours) {
    console.log('\n=== DEBUG CATEGORIZAÇÃO ===');
    console.log('Entry:', { date: entry.date, startTime: entry.startTime, endTime: entry.endTime });
    console.log('Overtime hours:', overtimeHours);
    
    const result = originalCategorize.call(this, entry, overtimeHours);
    console.log('Resultado categorização:', result);
    console.log('=== FIM DEBUG ===\n');
    
    return result;
  };
  
  const result = service.extractOvertimeFromTimesheet([testEntry]);
  console.log('Resultado do serviço:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Erro:', error);
}