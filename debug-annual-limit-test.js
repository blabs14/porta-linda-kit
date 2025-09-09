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

// Criar 200 entradas com datas válidas (aproximadamente 7 meses de trabalho)
const entries = [];
const startDate = new Date('2024-01-01');
for (let i = 0; i < 200; i++) {
  const currentDate = new Date(startDate);
  currentDate.setDate(startDate.getDate() + i);
  
  entries.push({
    date: currentDate.toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '19:00', // 10 horas - 1 hora de pausa = 9 horas (1 hora extra)
    breakMinutes: 60,
    description: `Trabalho dia ${i + 1}`,
    isHoliday: false,
    isSick: false,
    isVacation: false,
    isException: false
  });
}

console.log('Número de entradas:', entries.length);
console.log('Primeira entrada:', entries[0]);
console.log('Última entrada:', entries[entries.length - 1]);

const result = service.extractOvertimeFromTimesheet(entries);

console.log('Total overtime hours:', result.totalOvertimeHours);
console.log('Annual limit:', mockPolicy.annual_limit_hours);
console.log('Warnings:', result.warnings);
console.log('Number of warnings:', result.warnings.length);
console.log('Daily breakdown length:', result.dailyBreakdown.length);
console.log('First daily breakdown:', result.dailyBreakdown[0]);

if (result.totalOvertimeHours > mockPolicy.annual_limit_hours) {
  console.log('✅ Teste passou: totalOvertimeHours > annual_limit_hours');
} else {
  console.log('❌ Teste falhou: totalOvertimeHours não é maior que annual_limit_hours');
}

if (result.warnings.length > 0) {
  console.log('✅ Teste passou: warnings.length > 0');
} else {
  console.log('❌ Teste falhou: warnings.length não é maior que 0');
}