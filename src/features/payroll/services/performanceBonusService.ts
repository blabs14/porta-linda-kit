import { supabase } from '../../../lib/supabaseClient';
import {
  PerformanceBonusConfig,
  PerformanceBonusResult,
  PerformanceBonusConfigInput,
  PerformanceMetrics,
  PerformanceBonusCalculation
} from '../types/performanceBonus';
import { TimeEntry } from '../types';
import { formatDateLocal } from '@/lib/dateUtils';
import { logger } from '../../../shared/lib/logger';

export class PerformanceBonusService {
  // Configuration management
  static async getConfigs(contractId?: string): Promise<PerformanceBonusConfig[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('performance_bonus_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (contractId) {
      query = query.eq('contract_id', contractId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async createConfig(input: PerformanceBonusConfigInput, contractId?: string): Promise<PerformanceBonusConfig> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('performance_bonus_configs')
      .insert({
        ...input,
        user_id: user.id,
        contract_id: contractId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateConfig(id: string, input: Partial<PerformanceBonusConfigInput>): Promise<PerformanceBonusConfig> {
    const { data, error } = await supabase
      .from('performance_bonus_configs')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteConfig(id: string): Promise<void> {
    const { error } = await supabase
      .from('performance_bonus_configs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Performance metrics calculation
  static calculatePerformanceMetrics(
    timeEntries: TimeEntry[],
    periodStart: Date,
    periodEnd: Date
  ): PerformanceMetrics {
    const workingDays = this.getWorkingDaysInPeriod(periodStart, periodEnd);
    const entriesInPeriod = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= periodStart && entryDate <= periodEnd;
    });

    // Calculate total hours worked
    const totalHours = entriesInPeriod.reduce((sum, entry) => {
      return sum + (entry.regular_hours || 0) + (entry.overtime_hours || 0);
    }, 0);

    // Calculate punctuality score (based on start times)
    const punctualityScore = this.calculatePunctualityScore(entriesInPeriod);

    // Calculate attendance rate
    const daysWorked = new Set(entriesInPeriod.map(entry => entry.date)).size;
    const attendanceRate = workingDays > 0 ? (daysWorked / workingDays) * 100 : 0;

    // Calculate overtime ratio
    const regularHours = entriesInPeriod.reduce((sum, entry) => sum + (entry.regular_hours || 0), 0);
    const overtimeHours = entriesInPeriod.reduce((sum, entry) => sum + (entry.overtime_hours || 0), 0);
    const overtimeRatio = regularHours > 0 ? overtimeHours / regularHours : 0;

    // Calculate weekly consistency score
    const weeklyConsistencyScore = this.calculateWeeklyConsistencyScore(entriesInPeriod, periodStart, periodEnd);

    return {
      hours_worked: totalHours,
      punctuality_score: punctualityScore,
      attendance_rate: attendanceRate,
      overtime_ratio: overtimeRatio,
      weekly_consistency_score: weeklyConsistencyScore
    };
  }

  private static calculatePunctualityScore(entries: TimeEntry[]): number {
    if (entries.length === 0) return 0;

    const standardStartTime = 9; // 9:00 AM
    let punctualDays = 0;

    entries.forEach(entry => {
      if (entry.start_time) {
        const startHour = parseInt(entry.start_time.split(':')[0]);
        if (startHour <= standardStartTime) {
          punctualDays++;
        }
      }
    });

    return (punctualDays / entries.length) * 100;
  }

  private static calculateWeeklyConsistencyScore(entries: TimeEntry[], periodStart: Date, periodEnd: Date): number {
    const weeks = this.getWeeksInPeriod(periodStart, periodEnd);
    if (weeks.length === 0) return 0;

    let consistentWeeks = 0;
    const targetDaysPerWeek = 5; // Monday to Friday

    weeks.forEach(week => {
      const weekEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= week.start && entryDate <= week.end;
      });

      const daysWorkedInWeek = new Set(weekEntries.map(entry => entry.date)).size;
      if (daysWorkedInWeek >= targetDaysPerWeek * 0.8) { // 80% consistency threshold
        consistentWeeks++;
      }
    });

    return (consistentWeeks / weeks.length) * 100;
  }

  private static getWorkingDaysInPeriod(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  private static getWeeksInPeriod(start: Date, end: Date): Array<{ start: Date; end: Date }> {
    const weeks = [];
    const current = new Date(start);

    // Move to the start of the week (Monday)
    while (current.getDay() !== 1) {
      current.setDate(current.getDate() - 1);
    }

    while (current <= end) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

      weeks.push({ start: weekStart, end: weekEnd });
      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }

  // Bonus calculation
  static calculatePerformanceBonus(
    config: PerformanceBonusConfig,
    metrics: PerformanceMetrics,
    periodStart: string,
    periodEnd: string,
    baseSalary: number = 0
  ): PerformanceBonusCalculation {
    const metricValue = this.getMetricValue(metrics, config.metric_type);
    const thresholdMet = this.evaluateThreshold(metricValue, config.threshold_value, config.threshold_operator);

    let calculatedAmount = 0;
    if (thresholdMet) {
      if (config.bonus_type === 'fixed_amount') {
        calculatedAmount = config.bonus_value;
      } else { // percentage
        calculatedAmount = (baseSalary * config.bonus_value) / 100;
      }

      // Apply maximum bonus limit if set
      if (config.max_bonus_amount && calculatedAmount > config.max_bonus_amount) {
        calculatedAmount = config.max_bonus_amount;
      }
    }

    return {
      config,
      metrics,
      period_start: periodStart,
      period_end: periodEnd,
      threshold_met: thresholdMet,
      calculated_amount: calculatedAmount,
      details: {
        metric_value: metricValue,
        threshold_value: config.threshold_value,
        operator: config.threshold_operator,
        bonus_calculation: config.bonus_type === 'fixed_amount' 
          ? `Fixed amount: €${config.bonus_value}`
          : `${config.bonus_value}% of base salary (€${baseSalary}) = €${calculatedAmount}`
      }
    };
  }

  private static getMetricValue(metrics: PerformanceMetrics, metricType: string): number {
    switch (metricType) {
      case 'hours_worked':
        return metrics.hours_worked;
      case 'punctuality':
        return metrics.punctuality_score;
      case 'attendance':
        return metrics.attendance_rate;
      case 'overtime_ratio':
        return metrics.overtime_ratio;
      case 'weekly_consistency':
        return metrics.weekly_consistency_score;
      default:
        return 0;
    }
  }

  private static evaluateThreshold(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case '>=':
        return value >= threshold;
      case '>':
        return value > threshold;
      case '<=':
        return value <= threshold;
      case '<':
        return value < threshold;
      case '=':
        return Math.abs(value - threshold) < 0.01; // Allow for floating point precision
      default:
        return false;
    }
  }

  // Results management
  static async saveCalculationResult(calculation: PerformanceBonusCalculation): Promise<PerformanceBonusResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('performance_bonus_results')
      .insert({
        user_id: user.id,
        contract_id: calculation.config.contract_id,
        config_id: calculation.config.id,
        evaluation_period_start: calculation.period_start,
        evaluation_period_end: calculation.period_end,
        metric_value: calculation.details.metric_value,
        threshold_met: calculation.threshold_met,
        calculated_bonus_amount: calculation.calculated_amount,
        applied_bonus_amount: calculation.calculated_amount,
        calculation_details: calculation.details,
        status: 'calculated'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getResults(contractId?: string, period?: { start: string; end: string }): Promise<PerformanceBonusResult[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('performance_bonus_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (contractId) {
      query = query.eq('contract_id', contractId);
    }

    if (period) {
      query = query
        .gte('date', formatDateLocal(periodStart))
        .lte('date', formatDateLocal(periodEnd));
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async applyBonus(resultId: string): Promise<PerformanceBonusResult> {
    const { data, error } = await supabase
      .from('performance_bonus_results')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString()
      })
      .eq('id', resultId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async calculateAndSavePerformanceBonuses(
    userId: string,
    contractId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<PerformanceBonusResult[]> {
    try {
      // Get active performance bonus configurations for this contract
      const configs = await this.getConfigs(contractId);
      const activeConfigs = configs.filter(config => config.is_active);

      if (activeConfigs.length === 0) {
        return [];
      }

      // Get time entries for the period
      const { data: timeEntries, error: timeEntriesError } = await supabase
        .from('payroll_time_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('contract_id', contractId)
        .gte('date', formatDateLocal(periodStart))
        .lte('date', formatDateLocal(periodEnd));

      // TEMP LOG: resumo da query de time entries (sem dados sensíveis)
      logger.debug('[PerfBonus] time entries query', {
        userId: userId ? '***' + String(userId).slice(-4) : null,
        contractId: contractId ? '***' + String(contractId).slice(-4) : null,
        gte: formatDateLocal(periodStart),
        lte: formatDateLocal(periodEnd),
        count: Array.isArray(timeEntries) ? timeEntries.length : 0
      });

      if (timeEntriesError) throw timeEntriesError;

      // Calculate performance metrics
      const metrics = this.calculatePerformanceMetrics(
        timeEntries || [],
        periodStart,
        periodEnd
      );

      const results: PerformanceBonusResult[] = [];

      // Calculate and save bonus for each active configuration
      for (const config of activeConfigs) {
        const calculation = this.calculatePerformanceBonus(
          config,
          metrics,
          formatDateLocal(periodStart),
          formatDateLocal(periodEnd),
          0 // Base salary - could be retrieved from contract if needed
        );

        // Only save if threshold is met
        if (calculation.threshold_met) {
          const result = await this.saveCalculationResult(calculation);
          results.push(result);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error calculating and saving performance bonuses:', error);
      throw error;
    }
  }
}

// Export a singleton instance for convenience
export const performanceBonusService = new PerformanceBonusService();