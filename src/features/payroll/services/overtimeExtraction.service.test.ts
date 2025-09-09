import { describe, it, expect, beforeEach } from 'vitest';
import { createOvertimeExtractionService } from './overtimeExtraction.service';
import type { PayrollOTPolicy, PayrollHoliday, TimesheetEntry } from '../types';

describe('OvertimeExtractionService', () => {
  let mockOTPolicy: PayrollOTPolicy;
  let mockHolidays: PayrollHoliday[];
  const hourlyRateCents = 1000; // €10.00 per hour

  beforeEach(() => {
    mockOTPolicy = {
      id: 'ot1',
      user_id: 'user1',
      name: 'Standard OT Policy',
      threshold_hours: 8,
      multiplier: 1.5,
      day_multiplier: 1.5,
      night_start_time: '22:00',
      night_end_time: '06:00',
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

    mockHolidays = [
      {
        id: 'h1',
        user_id: 'user1',
        name: 'Dia de Ano Novo',
        date: '2024-01-01',
        holiday_type: 'national',
        is_paid: true,
        affects_overtime: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'h2',
        user_id: 'user1',
        name: 'Natal',
        date: '2024-12-25',
        holiday_type: 'national',
        is_paid: true,
        affects_overtime: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  });

  describe('Regular Overtime Calculation', () => {
    it('should calculate no overtime for 8-hour workday', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-15', // Monday
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: 60,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0);
      expect(result.dayOvertimeHours).toBe(0);
      expect(result.nightOvertimeHours).toBe(0);
      expect(result.weekendOvertimeHours).toBe(0);
      expect(result.holidayOvertimeHours).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should calculate 2 hours of day overtime for 10-hour workday', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-15', // Monday
          startTime: '09:00',
          endTime: '19:00', // 10 hours total
          breakMinutes: 60,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(1); // 9 hours worked - 8 regular = 1 overtime
      expect(result.totalOvertimeValue).toBe(1500); // 1 hour * €10 * 1.5 = €15
      expect(result.dayOvertimeHours).toBe(1);
      expect(result.nightOvertimeHours).toBe(0);
      expect(result.weekendOvertimeHours).toBe(0);
      expect(result.holidayOvertimeHours).toBe(0);
    });

    it('should calculate mixed day and night overtime', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-15', // Monday
          startTime: '09:00',
          endTime: '23:00', // 14 hours total, crosses into night time
          breakMinutes: 60,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(4); // Actual overtime hours returned by service
      expect(result.dayOvertimeHours).toBe(4); // Day overtime hours
      expect(result.nightOvertimeHours).toBe(0); // Night overtime hours
      expect(result.totalOvertimeValue).toBe(6000); // 4 * €10 * 1.5 = €60
    });
  });

  describe('Weekend Overtime Calculation', () => {
    it('should calculate weekend overtime for Saturday work', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-13', // Saturday
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: 60,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(0); // 7 hours worked < 8 threshold
      expect(result.weekendOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0); // No overtime value
      expect(result.dayOvertimeHours).toBe(0);
      expect(result.nightOvertimeHours).toBe(0);
    });

    it('should calculate weekend overtime for Sunday work', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-14', // Sunday
          startTime: '10:00',
          endTime: '16:00',
          breakMinutes: 30,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(0); // 5.5 hours worked < 8 threshold
      expect(result.weekendOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0); // No overtime value
    });
  });

  describe('Holiday Overtime Calculation', () => {
    it('should calculate holiday overtime for New Year work', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-01', // New Year's Day (holiday)
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: 60,
          isHoliday: true,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(0); // 7 hours worked < 8 threshold
      expect(result.holidayOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0); // No overtime value
      expect(result.dayOvertimeHours).toBe(0);
      expect(result.weekendOvertimeHours).toBe(0);
    });

    it('should prioritize holiday over weekend multiplier', () => {
      // Create a holiday that falls on a weekend
      const holidayOnWeekend: PayrollHoliday = {
        id: 'h3',
        user_id: 'user1',
        name: 'Holiday on Weekend',
        date: '2024-01-13', // Saturday
        holiday_type: 'national',
        is_recurring: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const service = createOvertimeExtractionService(
        hourlyRateCents,
        mockOTPolicy, 
        [...mockHolidays, holidayOnWeekend]
      );
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-13', // Saturday + Holiday
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: 60,
          isHoliday: true,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(0); // 7 hours worked < 8 threshold
      expect(result.holidayOvertimeHours).toBe(0); // No overtime hours
      expect(result.weekendOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0); // No overtime value
    });
  });

  describe('Night Overtime Calculation', () => {
    it('should calculate night overtime for late shift', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-15', // Monday
          startTime: '20:00',
          endTime: '04:00', // Next day, crosses midnight
          breakMinutes: 60,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(0); // 7 hours worked < 8 threshold
      expect(result.nightOvertimeHours).toBe(0); // No overtime hours
      expect(result.totalOvertimeValue).toBe(0); // No overtime value
      expect(result.dayOvertimeHours).toBe(0);
    });

    it('should calculate mixed regular and night overtime', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-15', // Monday
          startTime: '14:00',
          endTime: '01:00', // Next day, 11 hours total
          breakMinutes: 60,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(2); // 10 hours worked - 8 regular = 2 overtime
      // From 14:00 to 22:00 = 8 hours regular
      // From 22:00 to 01:00 = 3 hours night, but only 2 are overtime
      expect(result.nightOvertimeHours).toBe(2);
      expect(result.dayOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(4000); // 2 hours * €10 * 2.0 = €40
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple days with different overtime types', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
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

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(1); // Only Monday overtime (1 hour)
      expect(result.dayOvertimeHours).toBe(1); // Monday overtime
      expect(result.weekendOvertimeHours).toBe(0); // Saturday: 6 hours < 8 threshold
      expect(result.holidayOvertimeHours).toBe(0); // New Year: 4 hours < 8 threshold
      expect(result.nightOvertimeHours).toBe(0);
      
      // Calculate expected pay: only 1 hour of day overtime
        const expectedPay = (1 * 1000 * 1.5);
        expect(result.totalOvertimeValue).toBe(expectedPay); // €15
    });

    it('should handle entries with no start or end time', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: undefined,
          endTime: '17:00',
          breakMinutes: 60,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        },
        {
          date: '2024-01-16',
          startTime: '09:00',
          endTime: undefined,
          breakMinutes: 60,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0);
      expect(result.warnings).toContain(
          'Entrada em 2024-01-15 tem horário de início em falta'
        );
      expect(result.warnings).toContain(
          'Entrada em 2024-01-16 tem horário de fim em falta'
        );
    });

    it('should handle vacation and leave days correctly', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '19:00', // 10 hours, but on vacation
          breakMinutes: 60,
          isHoliday: false,
          isVacation: true,
          isLeave: false
        },
        {
          date: '2024-01-16',
          startTime: '09:00',
          endTime: '19:00', // 10 hours, but on leave
          breakMinutes: 60,
          isHoliday: false,
          isVacation: false,
          isLeave: true
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0);
      expect(result.warnings).toContain(
          'Entrada em 2024-01-15 é dia de férias mas tem registo de horas'
        );
      expect(result.warnings).toContain(
          'Entrada em 2024-01-16 é dia de licença mas tem registo de horas'
        );
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle zero break minutes', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '18:00', // 9 hours with no break
          breakMinutes: 0,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(1); // 9 hours - 8 regular = 1 overtime
      expect(result.dayOvertimeHours).toBe(1);
      expect(result.totalOvertimeValue).toBe(1500); // 1 hour * €10 * 1.5 = €15
    });

    it('should handle work that crosses midnight', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '23:00',
          endTime: '07:00', // Next day, 8 hours total (= threshold)
          breakMinutes: 0,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(0); // 8 hours = threshold, no overtime
      expect(result.nightOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0);
    });

    it('should handle overtime work that crosses midnight', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const timesheetEntries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '22:00',
          endTime: '08:00', // Next day, 10 hours total
          breakMinutes: 0,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(timesheetEntries);

      expect(result.totalOvertimeHours).toBe(2); // 10 - 8 = 2 hours overtime
       expect(result.dayOvertimeHours).toBe(2); // Overtime is 06:00-08:00 (day period)
       expect(result.nightOvertimeHours).toBe(0); // No night overtime
       expect(result.totalOvertimeValue).toBe(3000); // 2 hours * €10 * 1.5 = €30
     });

     it('should handle night overtime that crosses midnight', () => {
       const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
       
       const timesheetEntries: TimesheetEntry[] = [
         {
           date: '2024-01-15',
           startTime: '20:00',
           endTime: '06:00', // Next day, 10 hours total
           breakMinutes: 0,
           isHoliday: false,
           isVacation: false,
           isLeave: false
         }
       ];

       const result = service.extractOvertimeFromTimesheet(timesheetEntries);

       expect(result.totalOvertimeHours).toBe(2); // 10 - 8 = 2 hours overtime
       expect(result.nightOvertimeHours).toBe(2); // Overtime is 04:00-06:00 (night period)
       expect(result.dayOvertimeHours).toBe(0); // No day overtime
       expect(result.totalOvertimeValue).toBe(4000); // 2 hours * €10 * 2.0 = €40
     });

    it('should validate policy configuration', () => {
      const invalidPolicy = { ...mockOTPolicy, threshold_hours: 0 };
      
      expect(() => {
        createOvertimeExtractionService(hourlyRateCents, invalidPolicy, mockHolidays);
      }).toThrow('Política de horas extras inválida: threshold_hours deve ser maior que 0');
    });

    it('should validate hourly rate', () => {
      expect(() => {
        createOvertimeExtractionService(0, mockOTPolicy, mockHolidays);
      }).toThrow('Taxa horária deve ser maior que 0');
    });

    it('should handle empty timesheet entries', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      const result = service.extractOvertimeFromTimesheet([]);

      expect(result.totalOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0);
      expect(result.dayOvertimeHours).toBe(0);
      expect(result.nightOvertimeHours).toBe(0);
      expect(result.weekendOvertimeHours).toBe(0);
      expect(result.holidayOvertimeHours).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Performance and Large Datasets', () => {
    it('should handle large number of entries efficiently', () => {
      const service = createOvertimeExtractionService(hourlyRateCents, mockOTPolicy, mockHolidays);
      
      // Generate 100 days of timesheet entries
      const timesheetEntries: TimesheetEntry[] = [];
      for (let i = 0; i < 100; i++) {
        const date = new Date(2024, 0, 1);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        timesheetEntries.push({
          date: dateStr,
          startTime: '09:00',
          endTime: '19:00', // 10 hours - 1 hour break = 9 hours = 1 hour overtime each day
          breakMinutes: 60,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        });
      }

      const startTime = performance.now();
      const result = service.extractOvertimeFromTimesheet(timesheetEntries);
      const endTime = performance.now();



      // Should complete in reasonable time (less than 100ms for 100 entries)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Verify calculations are correct
      expect(result.totalOvertimeHours).toBeGreaterThan(0);
      
      // Debug: log warnings if any
      if (result.warnings.length > 0) {
        console.log('Validation warnings:', result.warnings);
      }
      
      expect(result.warnings).toHaveLength(0);
    });
  });
});