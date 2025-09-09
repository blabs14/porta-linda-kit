import { OvertimeExtractionService } from './src/features/payroll/services/overtimeExtraction.service.js';

const mockPolicy = {
  id: 'p1',
  user_id: 'user1',
  name: 'Standard Policy',
  base_hourly_rate: 1500,
  threshold_hours: 8,
  night_start_time: '22:00',
  night_end_time: '06:00',
  day_multiplier: 1.5,
  night_multiplier: 2.0,
  weekend_multiplier: 2.0,
  holiday_multiplier: 2.5,
  daily_limit_hours: 4,
  weekly_limit_hours: 48,
  annual_limit_hours: 200,
  rounding_minutes: 15,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockHolidays = [
  {
    id: 'h1',
    user_id: 'user1',
    name: 'Dia de Ano Novo',
    date: '2024-01-01',
    holiday_type: 'national',
    is_recurring: true,
    affects_overtime: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const service = new OvertimeExtractionService(mockPolicy, mockHolidays);

const timesheetEntries = [
  // Regular weekday with day overtime
  {
    date: '2024-01-15', // Monday
    startTime: '09:00',
    endTime: '19:00', // 10 hours
    breakMinutes: 60,
    isHoliday: false,
    isVacation: false,
    isLeave: false
  },
  // Weekend work
  {
    date: '2024-01-13', // Saturday
    startTime: '10:00',
    endTime: '16:00', // 6 hours
    breakMinutes: 0,
    isHoliday: false,
    isVacation: false,
    isLeave: false
  },
  // Holiday work
  {
    date: '2024-01-01', // New Year's Day
    startTime: '12:00',
    endTime: '16:00', // 4 hours
    breakMinutes: 0,
    isHoliday: true,
    isVacation: false,
    isLeave: false
  }
];

console.log('=== Test Case Debug ===');
console.log('Entries:', JSON.stringify(timesheetEntries, null, 2));

const result = service.extractOvertimeFromTimesheet(timesheetEntries);

console.log('\n=== Final Result ===');
console.log(JSON.stringify(result, null, 2));

console.log('\n=== Expected vs Actual ===');
console.log('Expected totalOvertimeHours: 12');
console.log('Actual totalOvertimeHours:', result.totalOvertimeHours);
console.log('Expected dayOvertimeHours: 2');
console.log('Actual dayOvertimeHours:', result.dayOvertimeHours);
console.log('Expected weekendOvertimeHours: 6');
console.log('Actual weekendOvertimeHours:', result.weekendOvertimeHours);
console.log('Expected holidayOvertimeHours: 4');
console.log('Actual holidayOvertimeHours:', result.holidayOvertimeHours);