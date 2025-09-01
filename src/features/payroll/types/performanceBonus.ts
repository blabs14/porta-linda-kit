export type MetricType = 'hours_worked' | 'punctuality' | 'attendance' | 'overtime_ratio' | 'weekly_consistency';
export type ThresholdOperator = '>=' | '>' | '<=' | '<' | '=';
export type BonusType = 'fixed_amount' | 'percentage';
export type EvaluationPeriod = 'weekly' | 'monthly' | 'quarterly';
export type CalculationStatus = 'calculated' | 'applied' | 'cancelled';

export interface PerformanceBonusConfig {
  id: string;
  user_id: string;
  contract_id?: string;
  bonus_name: string;
  metric_type: MetricType;
  threshold_value: number;
  threshold_operator: ThresholdOperator;
  bonus_type: BonusType;
  bonus_value: number;
  max_bonus_amount?: number;
  evaluation_period: EvaluationPeriod;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PerformanceBonusResult {
  id: string;
  user_id: string;
  contract_id?: string;
  config_id: string;
  evaluation_period_start: string;
  evaluation_period_end: string;
  metric_value: number;
  threshold_met: boolean;
  calculated_bonus_amount: number;
  applied_bonus_amount: number;
  calculation_details?: Record<string, any>;
  status: CalculationStatus;
  applied_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceBonusConfigInput {
  bonus_name: string;
  metric_type: PerformanceBonusConfig['metric_type'];
  threshold_value: number;
  threshold_operator: PerformanceBonusConfig['threshold_operator'];
  bonus_type: PerformanceBonusConfig['bonus_type'];
  bonus_value: number;
  max_bonus_amount?: number;
  evaluation_period: PerformanceBonusConfig['evaluation_period'];
  is_active?: boolean;
}

export interface PerformanceMetrics {
  hours_worked: number;
  punctuality_score: number; // 0-100
  attendance_rate: number; // 0-100
  overtime_ratio: number; // overtime hours / regular hours
  weekly_consistency_score: number; // 0-100
}

export interface PerformanceBonusCalculation {
  config: PerformanceBonusConfig;
  metrics: PerformanceMetrics;
  period_start: string;
  period_end: string;
  threshold_met: boolean;
  calculated_amount: number;
  details: {
    metric_value: number;
    threshold_value: number;
    operator: string;
    bonus_calculation: string;
  };
}