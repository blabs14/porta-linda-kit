import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PayrollSummaryPage from './PayrollSummaryPage';
import { calculatePayroll } from '../services/calculation.service';
import { payrollService } from '../services/payrollService';
import { ActiveContractProvider } from '../contexts/ActiveContractContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import type { PayrollCalculationResult, TimesheetEntry, PayrollOTPolicy, PayrollHoliday, PayrollContract } from '../types';

// Mock all the services
vi.mock('../services/calculation.service');
vi.mock('../services/payrollService', () => ({
  payrollService: {
    getTimeEntries: vi.fn(),
    getActiveContract: vi.fn(),
    getActiveOTPolicy: vi.fn(),
    getHolidays: vi.fn()
  }
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('userId=user1'),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/payroll/summary'
}));
vi.mock('../../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: { id: 'user1' } })
}));
vi.mock('../contexts/ActiveContractContext', () => {
  const mockContext = {
    activeContract: { id: 'contract1', name: 'Test Contract' },
    contracts: [],
    loading: false,
    setActiveContract: vi.fn(),
    refreshContracts: vi.fn()
  };
  
  return {
    ActiveContractContext: {
      Provider: ({ children }: { children: React.ReactNode }) => children,
      Consumer: ({ children }: { children: any }) => children(mockContext)
    },
    ActiveContractProvider: ({ children }: { children: React.ReactNode }) => children
  };
});
vi.mock('../hooks/useActiveContract', () => ({
  useActiveContract: () => ({
    activeContract: { 
      id: 'contract1', 
      user_id: 'user1',
      position: 'Software Engineer',
      salary_cents: 300000,
      hourly_rate_cents: 1500,
      start_date: '2024-01-01',
      end_date: null,
      is_active: true,
      currency: 'EUR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    contracts: [],
    loading: false,
    setActiveContract: vi.fn(),
    refreshContracts: vi.fn()
  })
}));

const mockCalculatePayroll = calculatePayroll as Mock;
const mockPayrollService = payrollService as any;

describe('PayrollSummaryPage - Automatic Overtime Integration', () => {
  let queryClient: QueryClient;
  let mockContract: PayrollContract;
  let mockOTPolicy: PayrollOTPolicy;
  let mockHolidays: PayrollHoliday[];
  let mockTimesheetEntries: TimesheetEntry[];
  let mockCalculationResult: PayrollCalculationResult;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    mockContract = {
      id: 'contract1',
      user_id: 'user1',
      position: 'Software Engineer',
      salary_cents: 300000, // €3000
      hourly_rate_cents: 1500, // €15/hour
      start_date: '2024-01-01',
      end_date: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockOTPolicy = {
      id: 'ot1',
      user_id: 'user1',
      name: 'Standard Policy',
      threshold_hours: 8,
      multiplier: 1.5,
      night_start_time: '22:00',
      night_end_time: '06:00',
      night_multiplier: 2.0,
      weekend_multiplier: 2.0,
      holiday_multiplier: 2.5,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockHolidays = [
      {
        id: 'h1',
        user_id: 'user1',
        name: 'Natal',
        date: '2024-12-25',
        holiday_type: 'national',
        is_recurring: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    mockTimesheetEntries = [
      {
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '19:00', // 10 hours = 2 hours overtime
        breakMinutes: 60,
        isHoliday: false,
        isVacation: false,
        isLeave: false
      },
      {
        date: '2024-01-13', // Saturday
        startTime: '10:00',
        endTime: '16:00', // 6 hours weekend work
        breakMinutes: 0,
        isHoliday: false,
        isVacation: false,
        isLeave: false
      }
    ];

    mockCalculationResult = {
      calculation: {
        regularPay: 120000, // 1200.00 EUR in cents
        overtimePayDay: 15000, // 150.00 EUR in cents
        overtimePayNight: 7500, // 75.00 EUR in cents
        overtimePayWeekend: 10000, // 100.00 EUR in cents
        overtimePayHoliday: 5000, // 50.00 EUR in cents
        grossPay: 157500, // 1575.00 EUR in cents
        netPay: 140000, // 1400.00 EUR in cents
        irsDeduction: 12000, // 120.00 EUR in cents
        socialSecurityDeduction: 5500, // 55.00 EUR in cents
        mealAllowance: 8000, // 80.00 EUR in cents
        mileageReimbursement: 2000, // 20.00 EUR in cents
        punctualityBonus: 5000 // 50.00 EUR in cents
      },
      // Legacy fields for backward compatibility
      baseSalary: 120000,
      overtimePay: 37500, // Total overtime pay
      totalPay: 157500,
      deductions: 17500,
      netPay: 140000,
      overtimeHours: 27,
      regularHours: 160,
      details: {
        dayOvertimeHours: 10,
        nightOvertimeHours: 5,
        weekendOvertimeHours: 8,
        holidayOvertimeHours: 4,
        dayOvertimePay: 15000,
        nightOvertimePay: 7500,
        weekendOvertimePay: 10000,
        holidayOvertimePay: 5000
      }
    };

    // Setup default mocks
    mockPayrollService.getActiveContract.mockResolvedValue(mockContract);
    mockPayrollService.getActiveOTPolicy.mockResolvedValue(mockOTPolicy);
    mockPayrollService.getHolidays.mockResolvedValue(mockHolidays);
    mockPayrollService.getTimeEntries = vi.fn().mockResolvedValue(mockTimesheetEntries.map(entry => ({
      date: entry.date,
      start_time: entry.startTime,
      end_time: entry.endTime,
      break_minutes: entry.breakMinutes,
      description: entry.description || ''
    })));
    mockCalculatePayroll.mockResolvedValue(mockCalculationResult);
  });

  const renderComponent = () => {
    return render(
      <AuthProvider>
        <ActiveContractProvider>
          <QueryClientProvider client={queryClient}>
            <PayrollSummaryPage />
          </QueryClientProvider>
        </ActiveContractProvider>
      </AuthProvider>
    );
  };

  describe('Automatic Overtime Calculation Integration', () => {
    it('should load and display overtime data from timesheet automatically', async () => {
      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('€225.00')).toBeInTheDocument(); // Total overtime pay (€225.00 = 22500 cents)
      });

      // Verify that calculatePayroll was called with preCalculatedData
      expect(mockCalculatePayroll).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user1',
          contractId: 'contract1',
          year: expect.any(Number),
          month: expect.any(Number),
          preCalculatedData: expect.objectContaining({
            totalOvertimeHours: 8,
            totalOvertimePay: 22500, // In cents (€225.00)
            dayOvertimeHours: 2,
            nightOvertimeHours: 0,
            weekendOvertimeHours: 6,
            holidayOvertimeHours: 0
          })
        })
      );

      // Verify overtime breakdown is displayed
      expect(screen.getByText('2h')).toBeInTheDocument(); // Day overtime hours
      expect(screen.getByText('6h')).toBeInTheDocument(); // Weekend overtime hours
      expect(screen.getByText('0h')).toBeInTheDocument(); // Night overtime hours
      expect(screen.getByText('0h')).toBeInTheDocument(); // Holiday overtime hours
    });

    it('should handle timesheet entries with validation warnings', async () => {
      // Mock timesheet with problematic entries
      const problematicEntries: TimesheetEntry[] = [
        {
          date: '2024-01-15',
          startTime: undefined, // Missing start time
          endTime: '17:00',
          breakMinutes: 60,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        },
        {
          date: '2024-01-16',
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: 60,
          isHoliday: false,
          isVacation: true, // Vacation day with hours
          isLeave: false
        }
      ];

      mockPayrollService.getTimeEntries = vi.fn().mockResolvedValue(problematicEntries.map(entry => ({
        date: entry.date,
        start_time: entry.startTime,
        end_time: entry.endTime,
        break_minutes: entry.breakMinutes,
        description: entry.description || ''
      })));

      renderComponent();

      await waitFor(() => {
        // Should show warning indicators
        expect(screen.getByText(/avisos de validação/i)).toBeInTheDocument();
      });

      // Verify that calculatePayroll was still called with appropriate data
      expect(mockCalculatePayroll).toHaveBeenCalledWith(
        expect.objectContaining({
          preCalculatedData: expect.objectContaining({
            validationWarnings: expect.arrayContaining([
              expect.stringContaining('horário de início em falta'),
              expect.stringContaining('dia de férias mas tem registo de horas')
            ])
          })
        })
      );
    });

    it('should fallback to traditional calculation when timesheet is empty', async () => {
      mockPayrollService.getTimeEntries = vi.fn().mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('€0.00')).toBeInTheDocument(); // No overtime
      });

      // Verify that calculatePayroll was called without preCalculatedData
      expect(mockCalculatePayroll).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user1',
          contractId: 'contract1',
          year: expect.any(Number),
          month: expect.any(Number)
          // preCalculatedData should be undefined
        })
      );

      expect(mockCalculatePayroll).not.toHaveBeenCalledWith(
        expect.objectContaining({
          preCalculatedData: expect.anything()
        })
      );
    });

    it('should handle missing overtime policy gracefully (now optional)', async () => {
      mockPayrollService.getActiveOTPolicy.mockResolvedValue(null);

      renderComponent();

      await waitFor(() => {
        // Should NOT show error message since policy is now optional
        expect(screen.queryByText(/política de horas extras não configurada/i)).not.toBeInTheDocument();
      });

      // Should still calculate payroll normally without overtime
      expect(mockCalculatePayroll).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user1',
          contractId: 'contract1'
        })
      );
    });

    it('should recalculate overtime when month/year changes', async () => {
      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(mockCalculatePayroll).toHaveBeenCalledTimes(1);
      });

      // Simulate month change (this would typically come from a date picker)
      const monthSelect = screen.getByRole('combobox', { name: /mês/i });
      fireEvent.change(monthSelect, { target: { value: '2' } });

      await waitFor(() => {
        expect(mockCalculatePayroll).toHaveBeenCalledTimes(2);
      });

      // Verify new timesheet data was fetched for the new month
      expect(mockPayrollService.getTimeEntries).toHaveBeenCalledWith(
        'user1',
        expect.any(Number), // year
        2 // new month
      );
    });

    it('should handle recalculation button correctly', async () => {
      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('€225.00')).toBeInTheDocument();
      });

      // Click recalculate button
      const recalculateButton = screen.getByRole('button', { name: /recalcular/i });
      fireEvent.click(recalculateButton);

      await waitFor(() => {
        expect(mockCalculatePayroll).toHaveBeenCalledTimes(2);
      });

      // Verify fresh data was fetched
      expect(mockPayrollService.getTimeEntries).toHaveBeenCalledTimes(2);
      expect(mockPayrollService.getActiveOTPolicy).toHaveBeenCalledTimes(2);
      expect(mockPayrollService.getHolidays).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle timesheet service errors gracefully', async () => {
      mockPayrollService.getTimeEntries = vi.fn().mockRejectedValue(new Error('Timesheet service error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar dados da timesheet/i)).toBeInTheDocument();
      });

      // Should fallback to traditional calculation
      expect(mockCalculatePayroll).toHaveBeenCalledWith(
        expect.not.objectContaining({
          preCalculatedData: expect.anything()
        })
      );
    });

    it('should handle overtime policy service errors gracefully', async () => {
      mockPayrollService.getActiveOTPolicy.mockRejectedValue(new Error('Policy service error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar política de horas extras/i)).toBeInTheDocument();
      });

      // Should fallback to traditional calculation
      expect(mockCalculatePayroll).toHaveBeenCalledWith(
        expect.not.objectContaining({
          preCalculatedData: expect.anything()
        })
      );
    });

    it('should handle holidays service errors gracefully', async () => {
      mockPayrollService.getHolidays.mockRejectedValue(new Error('Holidays service error'));

      renderComponent();

      await waitFor(() => {
        // Should still proceed with calculation using empty holidays array
        expect(mockCalculatePayroll).toHaveBeenCalledWith(
          expect.objectContaining({
            preCalculatedData: expect.objectContaining({
              totalOvertimeHours: expect.any(Number)
            })
          })
        );
      });
    });

    it('should handle calculation service errors', async () => {
      mockCalculatePayroll.mockRejectedValue(new Error('Calculation error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/erro no cálculo da folha de pagamento/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not refetch data unnecessarily', async () => {
      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(mockPayrollService.getTimeEntries).toHaveBeenCalledTimes(1);
        expect(mockPayrollService.getActiveOTPolicy).toHaveBeenCalledTimes(1);
        expect(mockPayrollService.getHolidays).toHaveBeenCalledTimes(1);
      });

      // Re-render component (simulate navigation back)
      renderComponent();

      // Should use cached data, not refetch
      expect(mockPayrollService.getTimeEntries).toHaveBeenCalledTimes(1);
      expect(mockPayrollService.getActiveOTPolicy).toHaveBeenCalledTimes(1);
      expect(mockPayrollService.getHolidays).toHaveBeenCalledTimes(1);
    });

    it('should handle large timesheet datasets efficiently', async () => {
      // Generate large dataset
      const largeTimesheetEntries: TimesheetEntry[] = [];
      for (let i = 1; i <= 100; i++) {
        largeTimesheetEntries.push({
          date: `2024-01-${i.toString().padStart(2, '0')}`,
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          isHoliday: false,
          isVacation: false,
          isLeave: false
        });
      }

      mockPayrollService.getTimeEntries = vi.fn().mockResolvedValue(largeTimesheetEntries.map(entry => ({
        date: entry.date,
        start_time: entry.startTime,
        end_time: entry.endTime,
        break_minutes: entry.breakMinutes,
        description: entry.description || ''
      })));

      const startTime = performance.now();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/€/)).toBeInTheDocument();
      });
      const endTime = performance.now();

      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for overtime data', async () => {
      renderComponent();

      // Wait for the component to load and calculate payroll
      await waitFor(() => {
        expect(mockCalculatePayroll).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Debug: Check what's actually rendered
      screen.debug();
      console.log('Available aria-labels:', screen.getAllByRole('generic').map(el => el.getAttribute('aria-label')).filter(Boolean));

      // Wait for the overtime data to be rendered
      await waitFor(() => {
        expect(screen.getByLabelText(/total de horas extras/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/pagamento de horas extras/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should announce overtime calculation updates to screen readers', async () => {
      renderComponent();

      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent(/cálculo de horas extras atualizado/i);
      });
    });
  });
});