// Main module component
export { PayrollModule } from './PayrollModule';

// Setup and configuration components
export { PayrollSetupPage } from './PayrollSetupPage';
export { PayrollContractForm } from './PayrollContractForm';
export { PayrollOTPolicyForm } from './PayrollOTPolicyForm';
export { PayrollHolidaysManager } from './PayrollHolidaysManager';

// Timesheet components
export { PayrollTimesheetPage } from './PayrollTimesheetPage';
export { WeeklyTimesheetForm } from './WeeklyTimesheetForm';

// Mileage components
export { PayrollMileagePage } from './PayrollMileagePage';
export { PayrollMileagePolicyForm } from './PayrollMileagePolicyForm';
export { MileageTripForm } from './MileageTripForm';

// Period management components
export { PayrollPeriodPage } from './PayrollPeriodPage';

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
  PayrollMileageTripFormData
} from '../types';

// Re-export services
export { payrollService } from '../services/payrollService';

// Re-export calculation utilities
export {
  buildPlannedSchedule,
  segmentEntry,
  calcHourly,
  calcMeal,
  calcBonuses,
  calcMileage,
  calcMonth,
  centsToEuros,
  eurosToCents,
  formatCurrency,
  calculateHours,
  validateTimeEntry
} from '../lib/calc';