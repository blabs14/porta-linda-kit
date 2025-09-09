// Main module component
export { PayrollModule } from './PayrollModule';
export { PayrollNavigation } from './PayrollNavigation';
export { ContractSelector } from './ContractSelector';

// Setup and configuration components
export { PayrollSetupPage } from './PayrollSetupPage';
export { PayrollOnboardingWizard } from './PayrollOnboardingWizard';
export { PayrollContractForm } from './PayrollContractForm';
export { PayrollOTPolicyForm } from './PayrollOTPolicyForm';
// PayrollHolidaysManager removido - sincronização automática implementada

// Timesheet components
export { WeeklyTimesheetForm } from './WeeklyTimesheetForm';

// Mileage components
export { PayrollMileagePolicyForm } from './PayrollMileagePolicyForm';
export { MileageTripForm } from './MileageTripForm';

// Performance bonus components
export { PerformanceBonusConfig } from './PerformanceBonusConfig';
export { PerformanceBonusResults } from './PerformanceBonusResults';

// Period management components
// PayrollPeriodPage removed - not used in routing

// Re-export types for convenience
export type {
  PayrollContract,
  PayrollOTPolicy,
  PayrollHoliday,
  PayrollTimeEntry,
  PayrollMileagePolicy,
  PayrollMileageTrip,
  PayrollPeriod,
  PayrollItem,
  PayrollPayslip,
  TimeSegment,
  PlannedSchedule,
  PayrollCalculation,
  TimesheetEntry,
  WeeklyTimesheet,
  MileageEntry,
  PayrollItemType,
  PayrollPeriodStatus,
  PayrollContractFormData,
  PayrollOTPolicyFormData,
  PayrollHolidayFormData,
  PayrollMileagePolicyFormData,
  PayrollMileageTripFormData,
  PerformanceBonusResult,
  PerformanceBonusConfigInput,
  PerformanceMetrics,
  PerformanceBonusCalculation
} from '../types';

// Re-export services
export { payrollService } from '../services/payrollService';
export { performanceBonusService } from '../services/performanceBonusService';

// Re-export calculation utilities
export {
  buildPlannedSchedule,
  segmentEntry,
  calcHourly,
  calcMeal,
  calcBonuses,
  calcSubsidies,
  calcMileage,
  calcMonth,
  centsToEuros,
  eurosToCents,

  calculateHours,
  validateTimeEntry
} from '../lib/calc';

// Re-export subsidy service
export { subsidyService } from '../services/subsidyService';