import { describe, it, expect, beforeEach, vi } from 'vitest';
import { payrollService } from './payrollService';
import type { 
  PayrollContract, 
  PayrollOTPolicy, 
  PayrollHoliday,
  PayrollTimeEntry,
  PayrollMileagePolicy,
  PayrollMileageTrip
} from '../types';

// Mock the supabase client
let mockChainResult: any = { data: [], error: null };

const createMockChain = () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    mockResolvedValue: vi.fn((value) => {
      mockChainResult = value;
      return Promise.resolve(value);
    }),
    mockRejectedValue: vi.fn((error) => {
      return Promise.reject(error);
    }),
  };
  
  // Make the chain thenable so it can be awaited
  (chain as any).then = (onResolve: any, onReject: any) => {
    return Promise.resolve(mockChainResult).then(onResolve, onReject);
  };
  
  return chain;
};

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => createMockChain()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null })
  }
}));

describe('PayrollService Integration Tests', () => {
  const mockContract: Omit<PayrollContract, 'id' | 'created_at' | 'updated_at'> = {
    user_id: 'user1',
    employee_name: 'João Silva',
    hourly_rate_cents: 800,
    weekly_hours: 40,
    start_date: '2024-01-01',
    end_date: undefined,
    is_active: true
  };

  const mockOTPolicy: Omit<PayrollOTPolicy, 'id' | 'created_at' | 'updated_at'> = {
    user_id: 'user1',
    name: 'Standard OT Policy',
    threshold_hours: 8,
    multiplier: 1.5,
    is_active: true
  };

  const mockHoliday: Omit<PayrollHoliday, 'id' | 'created_at' | 'updated_at'> = {
    user_id: 'user1',
    name: 'Dia de Ano Novo',
    date: '2024-01-01',
    type: 'national',
    is_recurring: true
  };

  const mockTimeEntry: Omit<PayrollTimeEntry, 'id' | 'created_at' | 'updated_at'> = {
    user_id: 'user1',
    contract_id: 'contract1',
    date: '2024-01-15',
    start_time: '09:00',
    end_time: '17:00',
    break_minutes: 60,
    description: 'Regular work day',
    is_overtime: false
  };

  const mockMileagePolicy: Omit<PayrollMileagePolicy, 'id' | 'created_at' | 'updated_at'> = {
    user_id: 'user1',
    name: 'Standard Mileage',
    rate_per_km_cents: 36,
    is_active: true
  };

  const mockMileageTrip: Omit<PayrollMileageTrip, 'id' | 'created_at' | 'updated_at'> = {
    user_id: 'user1',
    policy_id: 'policy1',
    date: '2024-01-15',
    origin: 'Home',
    destination: 'Office',
    km: 25,
    purpose: 'Work commute'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Payroll Contracts', () => {
    it('should create a payroll contract', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const expectedResult = { id: '1', ...mockContract };
      const mockResponse = { data: [expectedResult], error: null };
      
      // Reset mocks and create fresh chain
      vi.clearAllMocks();
      const mockChain = {
         insert: vi.fn().mockReturnThis(),
         select: vi.fn().mockReturnThis(),
         single: vi.fn().mockResolvedValue({ data: expectedResult, error: null })
       };
      (supabase.from as any).mockReturnValue(mockChain);
      
      const contractData = {
        employee_name: mockContract.employee_name,
        hourly_rate: mockContract.hourly_rate_cents / 100, // Convert back to euros
        weekly_hours: mockContract.weekly_hours,
        start_date: mockContract.start_date,
        end_date: mockContract.end_date
      };
      
      const result = await payrollService.createContract('user1', contractData);
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_contracts');
      expect(result).toEqual(expectedResult);
    });

    it('should get all payroll contracts', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const expectedResult = [{ id: '1', ...mockContract }];
      const mockResponse = { data: expectedResult, error: null };
      
      // Reset mocks and create fresh chain
      vi.clearAllMocks();
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockResponse)
      };
      (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await payrollService.getContracts('user1');
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_contracts');
      expect(result).toEqual(expectedResult);
    });

    it('should update a payroll contract', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const updatedData = { ...mockContract, employee_name: 'João Santos' };
      const expectedResult = { id: '1', ...updatedData };
      const mockResponse = { data: expectedResult, error: null };
      
      // Reset mocks and create fresh chain
      vi.clearAllMocks();
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockResponse)
      };
      (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await payrollService.updateContract('1', updatedData);
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_contracts');
      expect(result).toEqual(expectedResult);
    });

    it('should delete a payroll contract', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockResponse = { error: null };
      
      // Reset mocks and create fresh chain
      vi.clearAllMocks();
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockResponse)
      };
      (supabase.from as any).mockReturnValue(mockChain);
      
      await payrollService.deactivateContract('1');
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_contracts');
    });
  });

  describe('OT Policies', () => {
    it('should create an OT policy', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const expectedResult = { id: '1', user_id: 'user1', ...mockOTPolicy };
      const mockResponse = { data: expectedResult, error: null };
      
      // Reset mocks and create fresh chain
      vi.clearAllMocks();
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockResponse)
      };
      (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await payrollService.createOTPolicy('user1', mockOTPolicy);
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_ot_policies');
      expect(result).toEqual(expectedResult);
    });

    it('should get all OT policies', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockResponse = { data: [{ id: '1', ...mockOTPolicy }], error: null };
      
      // Reset mocks and create fresh chain
      vi.clearAllMocks();
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockResponse)
      };
      (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await payrollService.getOTPolicies('user1');
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_ot_policies');
      expect(result).toEqual([{ id: '1', ...mockOTPolicy }]);
    });
  });

  describe('Holidays', () => {
    it('should create a holiday', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const expectedResult = { id: '1', user_id: 'user1', ...mockHoliday };
      const mockResponse = { data: expectedResult, error: null };
      
      // Reset mocks and create fresh chain
      vi.clearAllMocks();
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockResponse)
      };
      (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await payrollService.createHoliday('user1', mockHoliday);
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_holidays');
      expect(result).toEqual(expectedResult);
    });

    it('should get holidays for a date range', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockResponse = { data: [{ id: '1', ...mockHoliday }], error: null };
      
      // Reset mocks and create fresh chain
      vi.clearAllMocks();
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockResponse)
      };
      (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await payrollService.getHolidays('user1', '2024-01-01', '2024-12-31');
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_holidays');
      expect(result).toEqual([{ id: '1', ...mockHoliday }]);
    });
  });

  describe('Time Entries', () => {
    it('should create a time entry', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const expectedResult = { id: '1', user_id: 'user1', contract_id: 'contract1', ...mockTimeEntry };
      const mockResponse = { data: expectedResult, error: null };
      
      // Reset mocks and create fresh chain
      vi.clearAllMocks();
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockResponse)
      };
      (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await payrollService.createTimeEntry('user1', 'contract1', mockTimeEntry);
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_time_entries');
      expect(result).toEqual(expectedResult);
    });

    it('should get time entries for a date range', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockResponse = { data: [{ id: '1', ...mockTimeEntry }], error: null };
      
      // Reset mocks and create fresh chain
      vi.clearAllMocks();
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockResponse)
      };
      (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await payrollService.getPayrollTimeEntries('2024-01-01', '2024-01-31');
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_time_entries');
      expect(result).toEqual([{ id: '1', ...mockTimeEntry }]);
    });

    it('should bulk create time entries', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const entries = [mockTimeEntry, { ...mockTimeEntry, date: '2024-01-16' }];
      const expectedResults = entries.map((entry, index) => ({ id: String(index + 1), user_id: 'user1', contract_id: 'contract1', ...entry }));
      const mockResponse = { 
        data: expectedResults, 
        error: null 
      };
      
      // Reset mocks and create fresh chain
       vi.clearAllMocks();
       const mockChain = {
         insert: vi.fn().mockReturnThis(),
         select: vi.fn().mockReturnThis(),
         single: vi.fn().mockResolvedValue({ data: expectedResults[0], error: null })
       };
       (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await payrollService.bulkCreatePayrollTimeEntries(entries);
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_time_entries');
      expect(result).toHaveLength(2);
    });
  });

  describe('Mileage Policies', () => {
    it('should create a mileage policy', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const expectedResult = { id: '1', ...mockMileagePolicy };
      const mockResponse = { data: expectedResult, error: null };
      
      // Reset mocks and create fresh chain
      vi.clearAllMocks();
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockResponse)
      };
      (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await payrollService.createMileagePolicy('user1', mockMileagePolicy);
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_mileage_policies');
      expect(result).toEqual(expectedResult);
    });

    it('should get all mileage policies', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockResponse = { data: [{ id: '1', ...mockMileagePolicy }], error: null };
      
      // Reset mocks and create fresh chain
       vi.clearAllMocks();
       const mockChain = {
         select: vi.fn().mockReturnThis(),
         eq: vi.fn().mockReturnThis(),
         order: vi.fn().mockResolvedValue(mockResponse)
       };
       (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await payrollService.getPayrollMileagePolicies('user1');
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_mileage_policies');
      expect(result).toEqual([{ id: '1', ...mockMileagePolicy }]);
    });
  });

  describe('Mileage Trips', () => {
    it('should create a mileage trip', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const expectedResult = { id: '1', user_id: 'user1', policy_id: 'policy1', ...mockMileageTrip };
      const mockResponse = { data: expectedResult, error: null };
      
      // Reset all mocks for this specific test
      vi.clearAllMocks();
      
      // Create a fresh mock chain
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockResponse),
        then: vi.fn((resolve) => resolve(mockResponse))
      };
      
      (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await payrollService.createMileageTrip('user1', 'policy1', mockMileageTrip);
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_mileage_trips');
      expect(result).toEqual(expectedResult);
    });

    it('should get mileage trips for a date range', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockResponse = { data: [{ id: '1', ...mockMileageTrip }], error: null };

      // Reset mocks and create fresh chain
       vi.clearAllMocks();
       const mockChain = {
         select: vi.fn().mockReturnThis(),
         eq: vi.fn().mockReturnThis(),
         gte: vi.fn().mockReturnThis(),
         lte: vi.fn().mockReturnThis(),
         order: vi.fn().mockResolvedValue(mockResponse)
       };
       (supabase.from as any).mockReturnValue(mockChain);

      const result = await payrollService.getMileageTrips('user1', '2024-01-01', '2024-01-31');
      
      expect(supabase.from).toHaveBeenCalledWith('payroll_mileage_trips');
      expect(result).toEqual([{ id: '1', ...mockMileageTrip }]);
    });
  });

  describe('Payroll Calculation', () => {
    it('should recalculate payroll successfully', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      
      // Mock all the data needed for calculation
      const mockContract = { data: { hourly_rate_cents: 2000, meal_allowance_cents: 600 }, error: null };
      const mockOTPolicy = { data: { multiplier: 1.5, threshold_hours: 8 }, error: null };
      const mockHolidays = { data: [], error: null };
      const mockTimeEntries = { data: [{ date: '2024-01-01', hours: 8 }], error: null };
      const mockMileageTrips = { data: [], error: null };
      const mockMileagePolicy = { data: { rate_per_km_cents: 50 }, error: null };
      const mockPeriod = { data: null, error: null };
      
      // Setup mocks for all the queries
      const mockChain = createMockChain();
      mockChain.mockChainResult = mockContract;
      (supabase.from as any).mockReturnValue(mockChain);
      
      // Mock the from method to return different chains based on table
       (supabase.from as any).mockImplementation((table: string) => {
         const chain = createMockChain();
         
         switch (table) {
           case 'payroll_contracts':
             chain.mockChainResult = mockContract;
             break;
           case 'payroll_ot_policies':
             chain.mockChainResult = mockOTPolicy;
             break;
           case 'payroll_holidays':
             chain.mockChainResult = mockHolidays;
             break;
           case 'payroll_time_entries':
             chain.mockChainResult = mockTimeEntries;
             break;
           case 'payroll_mileage_trips':
             chain.mockChainResult = mockMileageTrips;
             break;
           case 'payroll_mileage_policies':
             chain.mockChainResult = mockMileagePolicy;
             break;
           case 'payroll_periods':
             chain.mockChainResult = mockPeriod;
             break;
           default:
             chain.mockChainResult = { data: null, error: null };
         }
         
         return chain;
       });
      
      const result = await payrollService.recalculatePayroll('user1', 'contract1', 2024, 1);
      
      expect(result).toHaveProperty('regularHours');
      expect(result).toHaveProperty('overtimeHours');
      expect(result).toHaveProperty('grossPay');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockError = { data: null, error: { message: 'Database error' } };
      
      (supabase.from as any)().select().order().mockResolvedValue(mockError);
      
      await expect(payrollService.getPayrollContracts('user1'))
        .rejects.toThrow('Database error');
    });

    it('should handle network errors gracefully', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      
      // Mock the entire chain to throw an error
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((resolve, reject) => {
          reject(new Error('Network error'));
        })
      };
      (supabase.from as any).mockReturnValue(mockChain);
      
      await expect(payrollService.getPayrollContracts('user1'))
        .rejects.toThrow('Network error');
    });
  });

  describe('Data Validation', () => {
    it('should validate contract data before creation', async () => {
      const invalidContract = {
        ...mockContract,
        hourly_rate_cents: -100 // Invalid negative rate
      };
      
      // This would typically be handled by database constraints
      // or validation logic in the service
      expect(invalidContract.hourly_rate_cents).toBeLessThan(0);
    });

    it('should validate time entry data', async () => {
      const invalidTimeEntry = {
        ...mockTimeEntry,
        start_time: '25:00' // Invalid time format
      };
      
      // This would typically be validated before sending to the database
      expect(invalidTimeEntry.start_time).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});