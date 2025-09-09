import { OvertimeExtractionService } from './src/features/payroll/services/overtimeExtraction.service.js';

// Mock policy
const mockPolicy = {
  id: 'test-policy',
  user_id: 'test-user',
  name: 'Test Policy',
  threshold_hours: 8,
  multiplier: 1.5,
  daily_limit_hours: 2,
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
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

// Create service instance
const service = new OvertimeExtractionService(mockPolicy, [], 1500); // 15€/hora em cêntimos

function generateTimesheetEntries(count) {
  const entries = [];
  const startDate = new Date('2024-01-01');
  
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    entries.push({
       date: date.toISOString().split('T')[0],
       startTime: '09:00',
       endTime: '18:00',
       breakMinutes: 60,
       description: `Work day ${i + 1}`,
       isHoliday: false,
       isSick: false,
       isVacation: false,
       isException: false
     });
  }
  
  return entries;
}

// Generate 100 test entries
const timesheetEntries = generateTimesheetEntries(100);

console.log('=== Performance Test Debug ===');
console.log('Generated entries:', timesheetEntries.length);

// Debug: Check first entry
console.log('First entry:', JSON.stringify(timesheetEntries[0], null, 2));

try {
  const result = service.extractOvertimeFromTimesheet(timesheetEntries);
  
  console.log('\n=== Performance Test Result ===');
  console.log('Total overtime hours:', result.totalOvertimeHours);
  console.log('Validation warnings count:', result.validationWarnings.length);
  console.log('Validation warnings:', result.validationWarnings);
  
  if (result.validationWarnings.length > 0) {
    console.log('\n=== Warning Details ===');
    result.validationWarnings.forEach((warning, index) => {
      console.log(`Warning ${index + 1}:`, warning);
    });
  }
  
} catch (error) {
  console.error('Error during test:', error);
}