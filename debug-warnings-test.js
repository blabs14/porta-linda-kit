import { OvertimeExtractionService } from './src/features/payroll/services/overtimeExtraction.service.js';

// Mock policy
const mockPolicy = {
  threshold_hours: 8, // Adicionar threshold_hours que estava em falta
  daily_limit_hours: 2,
  weekly_limit_hours: 10,
  annual_limit_hours: 150,
  day_multiplier: 1.5,
  night_multiplier: 1.75,
  weekend_multiplier: 2.0,
  holiday_multiplier: 2.5,
  rounding_minutes: 15,
  night_start_time: '22:00',
  night_end_time: '06:00'
};

console.log('Mock policy:', mockPolicy);

// Mock holidays
const mockHolidays = [];

// Create service
const service = new OvertimeExtractionService(mockPolicy, mockHolidays, 1500); // 15.00 euros por hora (1500 centavos)

// Create entries that exceed annual limit
const entries = Array.from({ length: 200 }, (_, i) => {
  const day = (i % 28) + 1;
  const month = Math.floor(i / 28) + 1;
  const dateStr = `2024-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  
  return {
    date: dateStr,
    startTime: '09:00',
    endTime: '19:00',
    breakMinutes: 60,
    description: `Trabalho dia ${i + 1}`,
    isHoliday: false,
    isSick: false
  };
});

console.log('Testing with', entries.length, 'entries');
console.log('Sample entry:', entries[0]);

// Test with just one entry first
const singleResult = service.extractOvertimeFromTimesheet([entries[0]]);
console.log('Single entry result:', singleResult);

const result = service.extractOvertimeFromTimesheet(entries);

console.log('Total overtime hours:', result.totalOvertimeHours);
console.log('Annual limit:', mockPolicy.annual_limit_hours);
console.log('Warnings:', result.warnings);
console.log('Number of warnings:', result.warnings.length);
console.log('Daily breakdown length:', result.dailyBreakdown.length);
if (result.dailyBreakdown.length > 0) {
  console.log('First daily breakdown:', result.dailyBreakdown[0]);
}

if (result.warnings.length > 0) {
  result.warnings.forEach((warning, index) => {
    console.log(`Warning ${index + 1}: "${warning}"`);
  });
}