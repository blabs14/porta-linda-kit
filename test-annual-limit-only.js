import { OvertimeExtractionService } from './src/features/payroll/services/overtimeExtraction.service.js';

const mockPolicy = {
  threshold_hours: 8,
  multiplier: 1.5,
  night_multiplier: 2.0,
  night_start_hour: 22,
  night_end_hour: 6,
  weekly_limit_hours: 40,
  daily_limit_hours: 12,
  annual_limit_hours: 150
};

const mockHolidays = [
  {
    id: '1',
    user_id: 'user1',
    date: '2024-01-01',
    holiday_type: 'national',
    is_paid: true,
    affects_overtime: true
  },
  {
    id: '2', 
    user_id: 'user1',
    date: '2024-12-25',
    holiday_type: 'national',
    is_paid: true,
    affects_overtime: true
  }
];

const service = new OvertimeExtractionService(mockPolicy, mockHolidays, 15);

// Create 200 entries that exceed annual limit
const entries = Array.from({ length: 200 }, (_, i) => ({
  id: `entry-${i}`,
  date: new Date(2024, 0, 1 + i).toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '19:00', // 10 hours total, 2 hours overtime
  breakMinutes: 60,
  description: `Work day ${i + 1}`,
  isHoliday: false,
  isSick: false,
  isLeave: false
}));

console.log('Testing annual limit with', entries.length, 'entries');
console.log('Annual limit:', mockPolicy.annual_limit_hours);

const result = service.extractOvertimeFromTimesheet(entries);

console.log('Total overtime hours:', result.totalOvertimeHours);
console.log('Warnings:', result.warnings);
console.log('Test passed:', result.warnings.length > 0 && result.warnings[0].includes('Limite anual'));