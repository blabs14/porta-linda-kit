import type {
  PayrollContract,
  PayrollDeduction,
  PayrollOTPolicy,
  PayrollMealAllowance,
  PayrollBonus,
} from '../contexts/PayrollConfigContext';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  component: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
  component: string;
}

export interface CrossValidationContext {
  contract: PayrollContract;
  deductions: PayrollDeduction[];
  otPolicies: PayrollOTPolicy[];
  mealAllowances: PayrollMealAllowance[];
  bonuses: PayrollBonus[];
}

/**
 * Validates individual contract configuration
 */
export function validateContract(contract: PayrollContract): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!contract.salary || contract.salary <= 0) {
    errors.push({
      field: 'salary',
      message: 'Salário deve ser maior que zero',
      severity: 'error',
      component: 'contract',
    });
  }

  if (!contract.currency) {
    errors.push({
      field: 'currency',
      message: 'Moeda deve ser especificada',
      severity: 'error',
      component: 'contract',
    });
  }

  if (!contract.start_date) {
    errors.push({
      field: 'start_date',
      message: 'Data de início deve ser especificada',
      severity: 'error',
      component: 'contract',
    });
  }

  if (!contract.contract_type) {
    errors.push({
      field: 'contract_type',
      message: 'Tipo de contrato deve ser especificado',
      severity: 'error',
      component: 'contract',
    });
  }

  // Business logic validations
  if (contract.salary && contract.salary < 760) { // Portuguese minimum wage 2024
    warnings.push({
      field: 'salary',
      message: 'Salário abaixo do salário mínimo nacional (€760)',
      suggestion: 'Verificar se o valor está correto',
      component: 'contract',
    });
  }

  if (contract.end_date && contract.start_date) {
    const startDate = new Date(contract.start_date);
    const endDate = new Date(contract.end_date);
    
    if (endDate <= startDate) {
      errors.push({
        field: 'end_date',
        message: 'Data de fim deve ser posterior à data de início',
        severity: 'error',
        component: 'contract',
      });
    }
  }

  if (!contract.workplace_location) {
    warnings.push({
      field: 'workplace_location',
      message: 'Localização do local de trabalho não especificada',
      suggestion: 'Necessário para sincronização automática de feriados',
      component: 'contract',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates deductions configuration
 */
export function validateDeductions(deductions: PayrollDeduction[], contract: PayrollContract): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (deductions.length === 0) {
    errors.push({
      field: 'deductions',
      message: 'Pelo menos uma dedução deve ser configurada',
      severity: 'error',
      component: 'deductions',
    });
    return { isValid: false, errors, warnings };
  }

  // Validate individual deductions
  deductions.forEach((deduction, index) => {
    if (!deduction.type) {
      errors.push({
        field: `deductions[${index}].type`,
        message: `Dedução ${index + 1}: Tipo deve ser especificado`,
        severity: 'error',
        component: 'deductions',
      });
    }

    if (!deduction.amount && !deduction.percentage) {
      errors.push({
        field: `deductions[${index}].amount`,
        message: `Dedução ${index + 1}: Valor ou percentagem deve ser especificado`,
        severity: 'error',
        component: 'deductions',
      });
    }

    if (deduction.amount && deduction.amount < 0) {
      errors.push({
        field: `deductions[${index}].amount`,
        message: `Dedução ${index + 1}: Valor não pode ser negativo`,
        severity: 'error',
        component: 'deductions',
      });
    }

    if (deduction.percentage && (deduction.percentage < 0 || deduction.percentage > 100)) {
      errors.push({
        field: `deductions[${index}].percentage`,
        message: `Dedução ${index + 1}: Percentagem deve estar entre 0 e 100`,
        severity: 'error',
        component: 'deductions',
      });
    }
  });

  // Cross-validation with contract
  const totalPercentage = deductions.reduce((sum, d) => sum + (d.percentage || 0), 0);
  if (totalPercentage > 50) {
    warnings.push({
      field: 'total_percentage',
      message: `Total de deduções em percentagem (${totalPercentage.toFixed(1)}%) é elevado`,
      suggestion: 'Verificar se todas as deduções estão corretas',
      component: 'deductions',
    });
  }

  const totalFixedAmount = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
  if (contract.salary && totalFixedAmount > contract.salary * 0.3) {
    warnings.push({
      field: 'total_amount',
      message: `Total de deduções fixas (€${totalFixedAmount.toFixed(2)}) representa mais de 30% do salário`,
      suggestion: 'Verificar se todas as deduções estão corretas',
      component: 'deductions',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates overtime policies
 */
export function validateOvertimePolicies(otPolicies: PayrollOTPolicy[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  otPolicies.forEach((policy, index) => {
    if (!policy.type) {
      errors.push({
        field: `otPolicies[${index}].type`,
        message: `Política ${index + 1}: Tipo deve ser especificado`,
        severity: 'error',
        component: 'overtime',
      });
    }

    if (!policy.rate_multiplier || policy.rate_multiplier <= 1) {
      errors.push({
        field: `otPolicies[${index}].rate_multiplier`,
        message: `Política ${index + 1}: Multiplicador deve ser maior que 1`,
        severity: 'error',
        component: 'overtime',
      });
    }

    if (policy.rate_multiplier && policy.rate_multiplier > 3) {
      warnings.push({
        field: `otPolicies[${index}].rate_multiplier`,
        message: `Política ${index + 1}: Multiplicador muito elevado (${policy.rate_multiplier})`,
        suggestion: 'Verificar se o valor está correto',
        component: 'overtime',
      });
    }

    if (policy.max_hours_per_day && policy.max_hours_per_day > 12) {
      warnings.push({
        field: `otPolicies[${index}].max_hours_per_day`,
        message: `Política ${index + 1}: Máximo de horas por dia muito elevado`,
        suggestion: 'Verificar limites legais de trabalho',
        component: 'overtime',
      });
    }

    if (policy.max_hours_per_week && policy.max_hours_per_week > 60) {
      warnings.push({
        field: `otPolicies[${index}].max_hours_per_week`,
        message: `Política ${index + 1}: Máximo de horas por semana muito elevado`,
        suggestion: 'Verificar limites legais de trabalho',
        component: 'overtime',
      });
    }
  });

  // Check for duplicate policy types
  const policyTypes = otPolicies.map(p => p.type).filter(Boolean);
  const duplicateTypes = policyTypes.filter((type, index) => policyTypes.indexOf(type) !== index);
  
  if (duplicateTypes.length > 0) {
    errors.push({
      field: 'policy_types',
      message: `Tipos de política duplicados: ${duplicateTypes.join(', ')}`,
      severity: 'error',
      component: 'overtime',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates meal allowances
 */
export function validateMealAllowances(mealAllowances: PayrollMealAllowance[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  mealAllowances.forEach((allowance, index) => {
    if (!allowance.daily_amount || allowance.daily_amount <= 0) {
      errors.push({
        field: `mealAllowances[${index}].daily_amount`,
        message: `Subsídio ${index + 1}: Valor diário deve ser maior que zero`,
        severity: 'error',
        component: 'meal_allowance',
      });
    }

    if (!allowance.payment_method) {
      errors.push({
        field: `mealAllowances[${index}].payment_method`,
        message: `Subsídio ${index + 1}: Método de pagamento deve ser especificado`,
        severity: 'error',
        component: 'meal_allowance',
      });
    }

    // Portuguese tax-exempt limit for meal allowances (2024)
    const TAX_EXEMPT_LIMIT = 6.0;
    if (allowance.daily_amount && allowance.daily_amount > TAX_EXEMPT_LIMIT) {
      warnings.push({
        field: `mealAllowances[${index}].daily_amount`,
        message: `Subsídio ${index + 1}: Valor diário (€${allowance.daily_amount}) acima do limite de isenção fiscal (€${TAX_EXEMPT_LIMIT})`,
        suggestion: 'Considerar ajustar o valor para beneficiar da isenção fiscal',
        component: 'meal_allowance',
      });
    }

    if (allowance.excluded_months && allowance.excluded_months.length > 6) {
      warnings.push({
        field: `mealAllowances[${index}].excluded_months`,
        message: `Subsídio ${index + 1}: Muitos meses excluídos (${allowance.excluded_months.length})`,
        suggestion: 'Verificar se a exclusão está correta',
        component: 'meal_allowance',
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates bonuses configuration
 */
export function validateBonuses(bonuses: PayrollBonus[], contract: PayrollContract): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  bonuses.forEach((bonus, index) => {
    if (!bonus.type) {
      errors.push({
        field: `bonuses[${index}].type`,
        message: `Bónus ${index + 1}: Tipo deve ser especificado`,
        severity: 'error',
        component: 'bonuses',
      });
    }

    if (!bonus.amount || bonus.amount <= 0) {
      errors.push({
        field: `bonuses[${index}].amount`,
        message: `Bónus ${index + 1}: Valor deve ser maior que zero`,
        severity: 'error',
        component: 'bonuses',
      });
    }

    if (!bonus.calculation_method) {
      errors.push({
        field: `bonuses[${index}].calculation_method`,
        message: `Bónus ${index + 1}: Método de cálculo deve ser especificado`,
        severity: 'error',
        component: 'bonuses',
      });
    }

    if (bonus.payment_month && (bonus.payment_month < 1 || bonus.payment_month > 12)) {
      errors.push({
        field: `bonuses[${index}].payment_month`,
        message: `Bónus ${index + 1}: Mês de pagamento deve estar entre 1 e 12`,
        severity: 'error',
        component: 'bonuses',
      });
    }
  });

  // Check for mandatory bonuses (13th and 14th month in Portugal)
  const mandatoryBonuses = bonuses.filter(b => b.type === 'mandatory');
  if (mandatoryBonuses.length < 2) {
    warnings.push({
      field: 'mandatory_bonuses',
      message: 'Faltam subsídios obrigatórios (13º e 14º mês)',
      suggestion: 'Adicionar subsídios de Natal e férias',
      component: 'bonuses',
    });
  }

  // Validate total bonus amount
  const totalBonusAmount = bonuses.reduce((sum, b) => sum + (b.amount || 0), 0);
  if (contract.salary && totalBonusAmount > contract.salary * 3) {
    warnings.push({
      field: 'total_bonus_amount',
      message: `Total de bónus (€${totalBonusAmount.toFixed(2)}) muito elevado comparado ao salário`,
      suggestion: 'Verificar se todos os valores estão corretos',
      component: 'bonuses',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Performs comprehensive cross-validation of all configurations
 */
export function validateCrossConfiguration(context: CrossValidationContext): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  // Validate individual components
  const contractValidation = validateContract(context.contract);
  const deductionsValidation = validateDeductions(context.deductions, context.contract);
  const overtimeValidation = validateOvertimePolicies(context.otPolicies);
  const mealAllowanceValidation = validateMealAllowances(context.mealAllowances);
  const bonusValidation = validateBonuses(context.bonuses, context.contract);

  // Collect all errors and warnings
  allErrors.push(
    ...contractValidation.errors,
    ...deductionsValidation.errors,
    ...overtimeValidation.errors,
    ...mealAllowanceValidation.errors,
    ...bonusValidation.errors
  );

  allWarnings.push(
    ...contractValidation.warnings,
    ...deductionsValidation.warnings,
    ...overtimeValidation.warnings,
    ...mealAllowanceValidation.warnings,
    ...bonusValidation.warnings
  );

  // Cross-component validations
  
  // Check if meal allowance payment method is consistent with contract type
  if (context.mealAllowances.length > 0 && context.contract.contract_type === 'freelancer') {
    allWarnings.push({
      field: 'meal_allowance_contract_type',
      message: 'Subsídio de alimentação pode não ser aplicável a contratos de freelancer',
      suggestion: 'Verificar aplicabilidade legal',
      component: 'cross_validation',
    });
  }

  // Check if overtime policies are reasonable for contract type
  if (context.otPolicies.length > 0 && context.contract.contract_type === 'part_time') {
    allWarnings.push({
      field: 'overtime_part_time',
      message: 'Políticas de horas extras podem não ser aplicáveis a contratos part-time',
      suggestion: 'Verificar aplicabilidade legal',
      component: 'cross_validation',
    });
  }

  // Check total compensation vs minimum wage
  const monthlySalary = context.contract.salary || 0;
  const monthlyBonuses = context.bonuses.reduce((sum, b) => sum + (b.amount || 0), 0) / 12;
  const monthlyMealAllowance = context.mealAllowances.reduce((sum, a) => {
    const workingDays = 22;
    const excludedMonths = a.excluded_months?.length || 0;
    return sum + ((a.daily_amount || 0) * workingDays * (12 - excludedMonths)) / 12;
  }, 0);

  const totalMonthlyCompensation = monthlySalary + monthlyBonuses + monthlyMealAllowance;
  const minimumWage = 760; // Portuguese minimum wage 2024

  if (totalMonthlyCompensation < minimumWage) {
    allErrors.push({
      field: 'total_compensation',
      message: `Compensação total mensal (€${totalMonthlyCompensation.toFixed(2)}) abaixo do salário mínimo`,
      severity: 'error',
      component: 'cross_validation',
    });
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Utility function to group validation results by component
 */
export function groupValidationResultsByComponent(result: ValidationResult) {
  const errorsByComponent: Record<string, ValidationError[]> = {};
  const warningsByComponent: Record<string, ValidationWarning[]> = {};

  result.errors.forEach(error => {
    if (!errorsByComponent[error.component]) {
      errorsByComponent[error.component] = [];
    }
    errorsByComponent[error.component].push(error);
  });

  result.warnings.forEach(warning => {
    if (!warningsByComponent[warning.component]) {
      warningsByComponent[warning.component] = [];
    }
    warningsByComponent[warning.component].push(warning);
  });

  return {
    errors: errorsByComponent,
    warnings: warningsByComponent,
  };
}

/**
 * Utility function to get validation summary
 */
export function getValidationSummary(result: ValidationResult) {
  const componentCounts: Record<string, { errors: number; warnings: number }> = {};

  result.errors.forEach(error => {
    if (!componentCounts[error.component]) {
      componentCounts[error.component] = { errors: 0, warnings: 0 };
    }
    componentCounts[error.component].errors++;
  });

  result.warnings.forEach(warning => {
    if (!componentCounts[warning.component]) {
      componentCounts[warning.component] = { errors: 0, warnings: 0 };
    }
    componentCounts[warning.component].warnings++;
  });

  return {
    totalErrors: result.errors.length,
    totalWarnings: result.warnings.length,
    isValid: result.isValid,
    componentCounts,
  };
}