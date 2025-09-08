import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PayrollCalculationService, CalculationInput } from './calculation.service';
import { PayrollContract, PayrollTimeEntry, PayrollOTPolicy, PayrollHoliday, PayrollMileageTrip } from '../types';

// Não precisamos de mock do crypto - vamos usar os hashes reais

describe('PayrollCalculationService', () => {
  let service: PayrollCalculationService;
  let mockContract: PayrollContract;
  let mockOTPolicy: PayrollOTPolicy;
  let mockTimeEntries: PayrollTimeEntry[];
  let mockHolidays: PayrollHoliday[];
  let mockMileageTrips: PayrollMileageTrip[];

  beforeEach(() => {
    service = new PayrollCalculationService();
    service.clearCache();

    mockContract = {
      id: 'contract-1',
      user_id: 'user-1',
      base_salary_cents: 120000, // €1200 (acima do salário mínimo €870)
      hourly_rate_cents: 750, // €7.50
      weekly_hours: 35,
      schedule_json: {
        monday: { enabled: true, start: '09:00', end: '18:00', break_minutes: 60 },
        tuesday: { enabled: true, start: '09:00', end: '18:00', break_minutes: 60 },
        wednesday: { enabled: true, start: '09:00', end: '18:00', break_minutes: 60 },
        thursday: { enabled: true, start: '09:00', end: '18:00', break_minutes: 60 },
        friday: { enabled: true, start: '09:00', end: '18:00', break_minutes: 60 },
        saturday: { enabled: false },
        sunday: { enabled: false }
      },
      currency: 'EUR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockOTPolicy = {
      id: 'ot-policy-1',
      user_id: 'user-1',
      multiplier: 1.5,
      daily_limit_hours: 8,
      weekly_limit_hours: 40,
      night_start: '22:00',
      night_end: '06:00',
      night_multiplier: 1.25,
      holiday_multiplier: 2.0,
      weekend_multiplier: 2.0,
      day_multiplier: 1.5,
      rounding_minutes: 15,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockTimeEntries = [
      {
        id: 'entry-1',
        user_id: 'user-1',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '18:00',
        break_minutes: 60,
        entry_type: 'work',
        notes: 'Dia normal de trabalho',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'entry-2',
        user_id: 'user-1',
        date: '2024-01-16',
        start_time: '09:00',
        end_time: '20:00',
        break_minutes: 60,
        entry_type: 'work',
        notes: 'Dia com horas extras',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    mockHolidays = [
      {
        id: 'holiday-1',
        user_id: 'user-1',
        date: '2024-01-17',
        name: 'Feriado Nacional',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    mockMileageTrips = [
      {
        id: 'trip-1',
        user_id: 'user-1',
        date: '2024-01-15',
        km: 50,
        purpose: 'Reunião com cliente',
        from_location: 'Escritório',
        to_location: 'Cliente A',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  });

  describe('calculate', () => {
    it('deve calcular corretamente a folha de pagamento', async () => {
      const input: CalculationInput = {
        contract: mockContract,
        timeEntries: mockTimeEntries,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays,
        mileageTrips: mockMileageTrips,
        mileageRateCents: 36
      };

      const result = await service.calculate(input);

      expect(result).toBeDefined();
      expect(result.calculation).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(result.hash).toHaveLength(64); // SHA-256 hash length
      expect(result.isFromCache).toBe(false);
      expect(result.calculation.regularHours).toBeGreaterThan(0);
      expect(result.calculation.grossPay).toBeGreaterThan(0);
    });

    it('deve retornar resultado do cache na segunda chamada', async () => {
      const input: CalculationInput = {
        contract: mockContract,
        timeEntries: mockTimeEntries,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays
      };

      // Primeira chamada
      const result1 = await service.calculate(input);
      expect(result1.isFromCache).toBe(false);

      // Segunda chamada (deve vir do cache)
      const result2 = await service.calculate(input);
      expect(result2.isFromCache).toBe(true);
      expect(result2.calculation).toEqual(result1.calculation);
    });

    it('deve gerar hashes diferentes para entradas diferentes', async () => {
      const input1: CalculationInput = {
        contract: mockContract,
        timeEntries: mockTimeEntries,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays
      };

      const input2: CalculationInput = {
        contract: { ...mockContract, base_salary_cents: 130000 },
        timeEntries: mockTimeEntries,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays
      };

      const result1 = await service.calculate(input1);
      const result2 = await service.calculate(input2);

      expect(result1.hash).toBeDefined();
      expect(result2.hash).toBeDefined();
      expect(result1.hash).not.toBe(result2.hash); // Hashes devem ser diferentes
    });

    it('deve lançar erro para parâmetros inválidos', async () => {
      const invalidInput: CalculationInput = {
        contract: { ...mockContract, base_salary_cents: 50000 }, // Salário abaixo do mínimo (€500 < €870)
        timeEntries: mockTimeEntries,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays
      };

      await expect(service.calculate(invalidInput)).rejects.toThrow('Parâmetros inválidos');
    });

    it('deve validar entradas de tempo inválidas', async () => {
      const invalidTimeEntries: PayrollTimeEntry[] = [
        {
          ...mockTimeEntries[0],
          start_time: '18:00',
          end_time: '09:00' // Hora de fim antes da hora de início
        }
      ];

      const input: CalculationInput = {
        contract: mockContract,
        timeEntries: invalidTimeEntries,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays
      };

      await expect(service.calculate(input)).rejects.toThrow('Parâmetros inválidos');
    });

    it('deve calcular corretamente sem viagens de quilometragem', async () => {
      const input: CalculationInput = {
        contract: mockContract,
        timeEntries: mockTimeEntries,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays
      };

      const result = await service.calculate(input);

      expect(result.calculation.mileageReimbursement).toBe(0);
    });

    it('deve calcular reembolso de quilometragem corretamente', async () => {
      const input: CalculationInput = {
        contract: mockContract,
        timeEntries: mockTimeEntries,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays,
        mileageTrips: mockMileageTrips,
        mileageRateCents: 36
      };

      const result = await service.calculate(input);

      // 50 km * €0.36 = €18.00 = 1800 centavos
      expect(result.calculation.mileageReimbursement).toBe(1800);
    });
  });

  describe('calculateBatch', () => {
    it('deve calcular múltiplas entradas', async () => {
      const inputs: CalculationInput[] = [
        {
          contract: mockContract,
          timeEntries: [mockTimeEntries[0]],
          otPolicy: mockOTPolicy,
          holidays: mockHolidays
        },
        {
          contract: mockContract,
          timeEntries: [mockTimeEntries[1]],
          otPolicy: mockOTPolicy,
          holidays: mockHolidays
        }
      ];

      const results = await service.calculateBatch(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].calculation).toBeDefined();
      expect(results[1].calculation).toBeDefined();
    });

    it('deve lidar com erros em lote', async () => {
      const inputs: CalculationInput[] = [
        {
          contract: mockContract,
          timeEntries: mockTimeEntries,
          otPolicy: mockOTPolicy,
          holidays: mockHolidays
        },
        {
          contract: { ...mockContract, base_salary_cents: 87000 }, // Salário mínimo (€870)
          timeEntries: [], // Sem entradas de tempo para simular erro
          otPolicy: mockOTPolicy,
          holidays: mockHolidays
        }
      ];

      const results = await service.calculateBatch(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].calculation.grossPay).toBeGreaterThan(0);
      expect(results[1].calculation.grossPay).toBe(0); // Sem entradas de tempo = sem pagamento
    });
  });

  describe('cache management', () => {
    it('deve limpar o cache corretamente', async () => {
      const input: CalculationInput = {
        contract: mockContract,
        timeEntries: mockTimeEntries,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays
      };

      // Adicionar ao cache
      await service.calculate(input);
      expect(service.getCacheStats().size).toBe(1);

      // Limpar cache
      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);

      // Próxima chamada não deve vir do cache
      const result = await service.calculate(input);
      expect(result.isFromCache).toBe(false);
    });

    it('deve retornar estatísticas do cache', () => {
      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('ttlMs');
      expect(stats.ttlMs).toBe(5 * 60 * 1000); // 5 minutos
    });
  });

  describe('validation', () => {
    it('deve validar contrato obrigatório', async () => {
      const input = {
        contract: null,
        timeEntries: mockTimeEntries,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays
      };

      await expect(service.calculate(input)).rejects.toThrow('Contrato é obrigatório');
    });

    it('deve validar política de horas extras obrigatória', async () => {
      const input = {
        contract: mockContract,
        timeEntries: mockTimeEntries,
        otPolicy: null,
        holidays: mockHolidays
      };

      await expect(service.calculate(input)).rejects.toThrow('Política de horas extras é obrigatória');
    });

    it('deve validar viagens de quilometragem', async () => {
      const invalidTrips: PayrollMileageTrip[] = [
        {
          ...mockMileageTrips[0],
          km: 0 // Distância inválida
        }
      ];

      const input: CalculationInput = {
        contract: mockContract,
        timeEntries: mockTimeEntries,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays,
        mileageTrips: invalidTrips
      };

      await expect(service.calculate(input)).rejects.toThrow('Distância deve ser maior que zero');
    });

    it('deve aceitar entrada sem entradas de tempo (com aviso)', async () => {
      const input: CalculationInput = {
        contract: mockContract,
        timeEntries: [],
        otPolicy: mockOTPolicy,
        holidays: mockHolidays
      };

      const result = await service.calculate(input);

      expect(result.calculation.regularHours).toBe(0);
      expect(result.calculation.grossPay).toBeGreaterThanOrEqual(0);
    });
  });

  describe('idempotency', () => {
    it('deve produzir resultados idênticos para entradas idênticas', async () => {
      const input: CalculationInput = {
        contract: mockContract,
        timeEntries: mockTimeEntries,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays,
        mileageTrips: mockMileageTrips
      };

      const result1 = await service.calculate(input);
      service.clearCache(); // Limpar cache para forçar recálculo
      const result2 = await service.calculate(input);

      expect(result1.calculation).toEqual(result2.calculation);
    });

    it('deve normalizar ordem das entradas para consistência do hash', async () => {
      const timeEntriesOrdered = [...mockTimeEntries].sort((a, b) => a.date.localeCompare(b.date));
      const timeEntriesReversed = [...mockTimeEntries].sort((a, b) => b.date.localeCompare(a.date));

      const input1: CalculationInput = {
        contract: mockContract,
        timeEntries: timeEntriesOrdered,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays
      };

      const input2: CalculationInput = {
        contract: mockContract,
        timeEntries: timeEntriesReversed,
        otPolicy: mockOTPolicy,
        holidays: mockHolidays
      };

      const result1 = await service.calculate(input1);
      const result2 = await service.calculate(input2);

      // Ambos devem ter o mesmo hash (devido à normalização)
      expect(result1.hash).toBe(result2.hash);
      expect(result2.isFromCache).toBe(true);
    });
  });
});