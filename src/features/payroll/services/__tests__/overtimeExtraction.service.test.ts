import { describe, it, expect, beforeEach } from 'vitest';
import { OvertimeExtractionService } from '../overtimeExtraction.service';
import type { TimesheetEntry, PayrollOTPolicy, PayrollHoliday } from '../../types';

describe('OvertimeExtractionService', () => {
  let service: OvertimeExtractionService;
  let mockPolicy: PayrollOTPolicy;
  let mockHolidays: PayrollHoliday[];

  beforeEach(() => {
    mockPolicy = {
      id: '1',
      user_id: 'user-1',
      name: 'Política Padrão',
      threshold_hours: 8,
      multiplier: 1.5,
      daily_limit_hours: 2,
      annual_limit_hours: 150,
      weekly_limit_hours: 40,
      day_multiplier: 1.5,
      night_multiplier: 1.75,
      weekend_multiplier: 2.0,
      holiday_multiplier: 2.5,
      night_start_time: '22:00',
      night_end_time: '06:00',
      rounding_minutes: 15,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockHolidays = [
      {
        id: '1',
        user_id: 'user-1',
        name: 'Natal',
        date: '2024-12-25',
        holiday_type: 'national' as const,
        is_paid: true,
        affects_overtime: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    service = new OvertimeExtractionService(mockPolicy, mockHolidays, 1500);
  });

  describe('Constructor validation', () => {
    it('should throw error if hourly rate is zero or negative', () => {
      expect(() => {
        new OvertimeExtractionService(mockPolicy, [], 0);
      }).toThrow('Taxa horária deve ser maior que 0');

      expect(() => {
        new OvertimeExtractionService(mockPolicy, [], -100);
      }).toThrow('Taxa horária deve ser maior que 0');
    });

    it('should throw error if policy threshold is zero or negative', () => {
      const invalidPolicy = { ...mockPolicy, threshold_hours: 0 };
      expect(() => {
        new OvertimeExtractionService(invalidPolicy, [], 1500);
      }).toThrow('Política de horas extras inválida: threshold_hours deve ser maior que 0');
    });
  });

  describe('extractOvertimeFromTimesheet', () => {
    it('should return zero overtime for entries within threshold', () => {
      const entries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: 60,
          description: 'Trabalho normal',
          isHoliday: false,
          isSick: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(entries);
      
      expect(result.totalOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0);
      expect(result.dailyBreakdown).toHaveLength(1);
      expect(result.dailyBreakdown[0].overtimeHours).toBe(0);
    });

    it('should calculate overtime for entries exceeding threshold', () => {
      const entries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '19:00', // 10 horas - 1 hora pausa = 9 horas (1 hora extra)
          breakMinutes: 60,
          description: 'Trabalho com horas extras',
          isHoliday: false,
          isSick: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(entries);
      
      expect(result.totalOvertimeHours).toBe(1);
      expect(result.totalOvertimeValue).toBe(2250); // 1 hora * 1500 cêntimos * 1.5
      expect(result.dailyBreakdown[0].overtimeHours).toBe(1);
    });

    it('should apply holiday multiplier correctly', () => {
      const entries: TimesheetEntry[] = [
        {
          date: '2024-12-25', // Natal
          startTime: '09:00',
          endTime: '19:00',
          breakMinutes: 60,
          description: 'Trabalho no feriado',
          isHoliday: true,
          isSick: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(entries);
      
      expect(result.totalOvertimeHours).toBe(1);
      expect(result.totalOvertimeValue).toBe(3750); // 1 hora * 1500 cêntimos * 2.5 (holiday multiplier)
    });

    it('should apply weekend multiplier correctly', () => {
      const entries: TimesheetEntry[] = [
        {
          date: '2024-01-13', // Sábado
          startTime: '09:00',
          endTime: '19:00',
          breakMinutes: 60,
          description: 'Trabalho no fim de semana',
          isHoliday: false,
          isSick: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(entries);
      
      expect(result.totalOvertimeHours).toBe(1);
      expect(result.totalOvertimeValue).toBe(3000); // 1 hora * 1500 cêntimos * 2.0 (weekend multiplier)
    });

    it('should apply night multiplier correctly', () => {
      const entries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '21:00',
          endTime: '07:00', // Trabalho noturno
          breakMinutes: 60,
          description: 'Trabalho noturno',
          isHoliday: false,
          isSick: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(entries);
      
      expect(result.totalOvertimeHours).toBe(1);
      expect(result.totalOvertimeValue).toBe(2625); // 1 hora * 1500 cêntimos * 1.75 (night multiplier)
    });

    it('should respect daily limit', () => {
      const entries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '23:00', // 14 horas - 1 hora pausa = 13 horas
          breakMinutes: 60,
          description: 'Trabalho excessivo',
          isHoliday: false,
          isSick: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(entries);
      
      // Limite diário é 2 horas extras (configurado em daily_limit_hours)
      // 13 horas trabalhadas - 8 horas regulares = 5 horas extras, mas limitado a 2
      expect(result.totalOvertimeHours).toBe(2);
      expect(result.dailyBreakdown[0].overtimeHours).toBe(2);
    });

    it('should handle sick days correctly', () => {
      const entries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '19:00',
          breakMinutes: 60,
          description: 'Dia de doença',
          isHoliday: false,
          isSick: true
        }
      ];

      const result = service.extractOvertimeFromTimesheet(entries);
      
      // Dias de doença não devem gerar horas extras
      expect(result.totalOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0);
    });

    it('should handle vacation days correctly', () => {
      const entries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '19:00',
          breakMinutes: 60,
          description: 'Dia de férias',
          isHoliday: false,
          isSick: false,
          isVacation: true
        }
      ];

      const result = service.extractOvertimeFromTimesheet(entries);
      
      // Dias de férias não devem gerar horas extras
      expect(result.totalOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0);
    });

    it('should calculate weekly overtime correctly', () => {
      const entries: TimesheetEntry[] = [
        // Segunda a sexta: 9 horas cada (1 hora extra por dia)
        ...Array.from({ length: 5 }, (_, i) => ({
          date: `2024-01-${15 + i}`, // 15-19 Janeiro (segunda a sexta)
          startTime: '09:00',
          endTime: '19:00',
          breakMinutes: 60,
          description: `Trabalho dia ${i + 1}`,
          isHoliday: false,
          isSick: false
        } as TimesheetEntry))
      ];

      const result = service.calculateWeeklyOvertime(entries);
      
      expect(result).toHaveLength(1); // Uma semana
      expect(result[0].totalHours).toBe(45); // 5 dias * 9 horas
      expect(result[0].overtimeHours).toBe(5); // 5 horas extras (45 - 40)
      expect(result[0].weeklyLimitExceeded).toBe(true); // Excede limite semanal
    });

    it('should handle empty timesheet entries', () => {
      const result = service.extractOvertimeFromTimesheet([]);
      
      expect(result.totalOvertimeHours).toBe(0);
      expect(result.totalOvertimeValue).toBe(0);
      expect(result.dailyBreakdown).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should generate warnings for annual limit exceeded', () => {
      const entries: TimesheetEntry[] = [];
      
      // Criar 200 entradas com 1 hora extra cada (total: 200 horas extras > 150 limite)
      // Criar 200 entradas com datas válidas (aproximadamente 7 meses de trabalho)
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

      const result = service.extractOvertimeFromTimesheet(entries);
      
      console.log('Total overtime hours:', result.totalOvertimeHours);
      console.log('Annual limit:', mockPolicy.annual_limit_hours);
      console.log('Warnings:', result.warnings);
      
      expect(result.totalOvertimeHours).toBeGreaterThan(mockPolicy.annual_limit_hours);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Limite anual de horas extras excedido:');
    });

    it('should handle cross-day shifts correctly', () => {
      const entries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '23:00',
          endTime: '07:00', // Termina no dia seguinte
          breakMinutes: 60,
          description: 'Turno noturno',
          isHoliday: false,
          isSick: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(entries);
      
      // 8 horas - 1 hora pausa = 7 horas (dentro do threshold)
      expect(result.totalOvertimeHours).toBe(0);
    });

    it('should round overtime hours according to policy', () => {
      // Política com arredondamento de 15 minutos
      const entries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '18:10', // 9h10min - 1h pausa = 8h10min (10 min extras)
          breakMinutes: 60,
          description: 'Trabalho com minutos extras',
          isHoliday: false,
          isSick: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(entries);
      
      // 10 minutos devem ser arredondados para 15 minutos (0.25 horas)
      expect(result.totalOvertimeHours).toBe(0.25);
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid time formats gracefully', () => {
      const entries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: 'invalid',
          endTime: '17:00',
          breakMinutes: 60,
          description: 'Horário inválido',
          isHoliday: false,
          isSick: false
        }
      ];

      expect(() => {
        service.extractOvertimeFromTimesheet(entries);
      }).not.toThrow();
    });

    it('should handle negative break minutes', () => {
      const entries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: -30,
          description: 'Pausa negativa',
          isHoliday: false,
          isSick: false
        }
      ];

      const result = service.extractOvertimeFromTimesheet(entries);
      
      // Deve tratar pausa negativa como 0
      expect(result.dailyBreakdown[0].workedHours).toBe(8);
    });

    it('should handle end time before start time', () => {
      const entries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: '17:00',
          endTime: '09:00', // Fim antes do início
          breakMinutes: 60,
          description: 'Horário invertido',
          isHoliday: false,
          isSick: false
        }
      ];

      expect(() => {
        service.extractOvertimeFromTimesheet(entries);
      }).not.toThrow();
    });
  });
});