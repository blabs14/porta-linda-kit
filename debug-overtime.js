import { OvertimeExtractionService } from './src/features/payroll/services/overtimeExtraction.service.js';

// Mock policy
const policy = {
  threshold_hours: 8,
  daily_limit_hours: 4,
  weekly_limit_hours: 48,
  annual_limit_hours: 200,
  day_multiplier: 1.5,
  night_multiplier: 2.0,
  weekend_multiplier: 2.0,
  holiday_multiplier: 2.5,
  night_start_time: '22:00',
  night_end_time: '06:00'
};

// Mock holidays
const holidays = [
  { date: '2024-01-01', name: 'New Year\'s Day', affects_overtime: true }
];

const service = new OvertimeExtractionService(policy, holidays, 1000); // €10 per hour in cents

// Test data
const timesheetEntries = [
  {
    date: '2024-01-15', // Monday
    startTime: '09:00',
    endTime: '19:00', // 10 hours
    breakMinutes: 60,
    isHoliday: false,
    isVacation: false,
    isLeave: false
  },
  {
    date: '2024-01-13', // Saturday
    startTime: '10:00',
    endTime: '16:00', // 6 hours
    breakMinutes: 0,
    isHoliday: false,
    isVacation: false,
    isLeave: false
  },
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

console.log('Starting overtime extraction test...');
const result = service.extractOvertimeFromTimesheet(timesheetEntries);
console.log('Final result:', JSON.stringify(result, null, 2));