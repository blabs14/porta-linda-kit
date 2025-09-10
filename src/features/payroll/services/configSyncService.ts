import { payrollService } from './payrollService';
import { deductionInferenceService } from './deductionInferenceService';
import { holidayAutoService } from './holidayAutoService';
import type {
  PayrollContract,
  PayrollDeduction,
  PayrollOTPolicy,
  PayrollMealAllowance,
  PayrollBonus,
  PayrollConfigState,
} from '../contexts/PayrollConfigContext';
import { validateCrossConfiguration } from '../utils/configValidation';

export interface SyncOptions {
  skipValidation?: boolean;
  skipAutoInference?: boolean;
  skipHolidaySync?: boolean;
  force?: boolean;
}

export interface SyncResult {
  success: boolean;
  updatedComponents: string[];
  errors: string[];
  warnings: string[];
  validationResult?: any;
}

export interface SyncEvent {
  type: 'sync_started' | 'sync_completed' | 'sync_failed' | 'component_updated';
  component?: string;
  data?: any;
  timestamp: Date;
}

type SyncEventListener = (event: SyncEvent) => void;

class ConfigSyncService {
  private listeners: SyncEventListener[] = [];
  private syncInProgress = false;
  private lastSyncTimestamp: Date | null = null;
  private syncQueue: Array<{ contractId: string; options: SyncOptions }> = [];

  /**
   * Subscribe to sync events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit sync event to all listeners
   */
  private emit(event: SyncEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in sync event listener:', error);
      }
    });
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncTimestamp(): Date | null {
    return this.lastSyncTimestamp;
  }

  /**
   * Queue a sync operation
   */
  queueSync(contractId: string, options: SyncOptions = {}): void {
    // Remove existing queue item for same contract
    this.syncQueue = this.syncQueue.filter(item => item.contractId !== contractId);
    
    // Add new item to queue
    this.syncQueue.push({ contractId, options });
    
    // Process queue if not already syncing
    if (!this.syncInProgress) {
      this.processQueue();
    }
  }

  /**
   * Process sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.syncQueue.length === 0 || this.syncInProgress) {
      return;
    }

    const { contractId, options } = this.syncQueue.shift()!;
    await this.syncConfiguration(contractId, options);
    
    // Process next item in queue
    if (this.syncQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100); // Small delay between syncs
    }
  }

  /**
   * Synchronize all configuration components for a contract
   */
  async syncConfiguration(contractId: string, options: SyncOptions = {}): Promise<SyncResult> {
    if (this.syncInProgress && !options.force) {
      throw new Error('Sync already in progress. Use force option to override.');
    }

    this.syncInProgress = true;
    const updatedComponents: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    this.emit({
      type: 'sync_started',
      data: { contractId, options },
      timestamp: new Date(),
    });

    try {
      // 1. Load current configuration state
      const currentState = await this.loadCurrentState(contractId);
      
      if (!currentState.contract) {
        throw new Error('Contract not found');
      }

      // 2. Perform cross-validation if not skipped
      let validationResult;
      if (!options.skipValidation) {
        validationResult = validateCrossConfiguration({
          contract: currentState.contract,
          deductions: currentState.deductions,
          otPolicies: currentState.otPolicies,
          mealAllowances: currentState.mealAllowances,
          bonuses: currentState.bonuses,
        });

        if (!validationResult.isValid) {
          errors.push(...validationResult.errors.map(e => e.message));
        }
        warnings.push(...validationResult.warnings.map(w => w.message));
      }

      // 3. Sync holidays if workplace location is available
      if (!options.skipHolidaySync && currentState.contract.workplace_location) {
        try {
          await holidayAutoService.syncHolidaysForContract(contractId);
          updatedComponents.push('holidays');
          
          this.emit({
            type: 'component_updated',
            component: 'holidays',
            data: { contractId },
            timestamp: new Date(),
          });
        } catch (error) {
          console.error('Holiday sync failed:', error);
          warnings.push('Falha na sincronização de feriados');
        }
      }

      // 4. Auto-infer deductions if enabled
      if (!options.skipAutoInference) {
        try {
          const inferenceResult = await deductionInferenceService.inferDeductionRates({
            salary: currentState.contract.salary,
            contractType: currentState.contract.contract_type,
            location: currentState.contract.workplace_location,
            year: new Date().getFullYear(),
          });

          if (inferenceResult.deductions.length > 0) {
            // Update deductions with inferred values
            await this.updateInferredDeductions(contractId, inferenceResult.deductions);
            updatedComponents.push('deductions');
            
            this.emit({
              type: 'component_updated',
              component: 'deductions',
              data: { contractId, inferredDeductions: inferenceResult.deductions },
              timestamp: new Date(),
            });
          }
        } catch (error) {
          console.error('Deduction inference failed:', error);
          warnings.push('Falha na inferência automática de deduções');
        }
      }

      // 5. Sync meal allowance tax limits
      try {
        await this.syncMealAllowanceLimits(contractId, currentState.mealAllowances);
        if (currentState.mealAllowances.length > 0) {
          updatedComponents.push('meal_allowances');
          
          this.emit({
            type: 'component_updated',
            component: 'meal_allowances',
            data: { contractId },
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error('Meal allowance sync failed:', error);
        warnings.push('Falha na sincronização de limites de subsídio de alimentação');
      }

      // 6. Validate mandatory bonuses
      try {
        await this.validateMandatoryBonuses(contractId, currentState.bonuses, currentState.contract);
        updatedComponents.push('bonuses');
        
        this.emit({
          type: 'component_updated',
          component: 'bonuses',
          data: { contractId },
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Bonus validation failed:', error);
        warnings.push('Falha na validação de subsídios obrigatórios');
      }

      this.lastSyncTimestamp = new Date();
      
      const result: SyncResult = {
        success: errors.length === 0,
        updatedComponents,
        errors,
        warnings,
        validationResult,
      };

      this.emit({
        type: 'sync_completed',
        data: result,
        timestamp: new Date(),
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      errors.push(errorMessage);
      
      const result: SyncResult = {
        success: false,
        updatedComponents,
        errors,
        warnings,
      };

      this.emit({
        type: 'sync_failed',
        data: { error: errorMessage, contractId },
        timestamp: new Date(),
      });

      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Load current configuration state for a contract
   */
  private async loadCurrentState(contractId: string): Promise<PayrollConfigState> {
    const [contract, deductions, otPolicies, mealAllowances, bonuses] = await Promise.all([
      payrollService.getContract(contractId),
      payrollService.getDeductionConfigs(userId),
      payrollService.getOTPoliciesByContract(contractId),
      payrollService.getMealAllowancesByContract(contractId),
      payrollService.getBonusesByContract(contractId),
    ]);

    return {
      contract,
      deductions,
      otPolicies,
      mealAllowances,
      bonuses,
      loading: false,
      error: null,
      lastUpdated: new Date(),
    };
  }

  /**
   * Update deductions with inferred values
   */
  private async updateInferredDeductions(
    contractId: string,
    inferredDeductions: any[]
  ): Promise<void> {
    const existingDeductions = await payrollService.getDeductionConfigs(userId);
    
    for (const inferred of inferredDeductions) {
      const existing = existingDeductions.find(d => d.type === inferred.type);
      
      if (existing) {
        // Update existing deduction
        await payrollService.updateDeduction(existing.id, {
          ...existing,
          percentage: inferred.percentage,
          amount: inferred.amount,
          auto_calculated: true,
          last_sync_date: new Date(),
        });
      } else {
        // Create new deduction
        await payrollService.createDeduction({
          contract_id: contractId,
          type: inferred.type,
          percentage: inferred.percentage,
          amount: inferred.amount,
          auto_calculated: true,
          last_sync_date: new Date(),
        });
      }
    }
  }

  /**
   * Sync meal allowance tax limits
   */
  private async syncMealAllowanceLimits(
    contractId: string,
    mealAllowances: PayrollMealAllowance[]
  ): Promise<void> {
    const TAX_EXEMPT_LIMIT = 6.0; // Portuguese 2024 limit
    
    for (const allowance of mealAllowances) {
      if (allowance.daily_amount > TAX_EXEMPT_LIMIT) {
        // Update with warning flag
        await payrollService.updateMealAllowance(allowance.id, {
          ...allowance,
          tax_exempt: false,
          notes: `Valor acima do limite de isenção fiscal (€${TAX_EXEMPT_LIMIT})`,
          last_sync_date: new Date(),
        });
      } else {
        // Ensure tax exempt flag is set
        await payrollService.updateMealAllowance(allowance.id, {
          ...allowance,
          tax_exempt: true,
          last_sync_date: new Date(),
        });
      }
    }
  }

  /**
   * Validate and ensure mandatory bonuses exist
   */
  private async validateMandatoryBonuses(
    contractId: string,
    bonuses: PayrollBonus[],
    contract: PayrollContract
  ): Promise<void> {
    const mandatoryBonuses = bonuses.filter(b => b.type === 'mandatory');
    
    // Check for 13th month bonus (Christmas)
    const christmasBonus = mandatoryBonuses.find(b => b.payment_month === 12);
    if (!christmasBonus) {
      await payrollService.createBonus({
        contract_id: contractId,
        type: 'mandatory',
        name: 'Subsídio de Natal',
        amount: contract.salary,
        calculation_method: 'fixed',
        payment_month: 12,
        auto_calculated: true,
        last_sync_date: new Date(),
      });
    }

    // Check for 14th month bonus (Vacation)
    const vacationBonus = mandatoryBonuses.find(b => b.payment_month === 6);
    if (!vacationBonus) {
      await payrollService.createBonus({
        contract_id: contractId,
        type: 'mandatory',
        name: 'Subsídio de Férias',
        amount: contract.salary,
        calculation_method: 'fixed',
        payment_month: 6,
        auto_calculated: true,
        last_sync_date: new Date(),
      });
    }
  }

  /**
   * Trigger sync when contract is updated
   */
  async onContractUpdate(contractId: string, updatedContract: PayrollContract): Promise<void> {
    // Check if workplace location changed (affects holiday sync)
    const currentContract = await payrollService.getContract(contractId);
    const locationChanged = currentContract?.workplace_location !== updatedContract.workplace_location;
    
    // Check if salary changed (affects deduction inference)
    const salaryChanged = currentContract?.salary !== updatedContract.salary;

    if (locationChanged || salaryChanged) {
      this.queueSync(contractId, {
        skipValidation: false,
        skipAutoInference: !salaryChanged,
        skipHolidaySync: !locationChanged,
      });
    }
  }

  /**
   * Trigger sync when deductions are updated
   */
  async onDeductionsUpdate(contractId: string): Promise<void> {
    this.queueSync(contractId, {
      skipValidation: false,
      skipAutoInference: true,
      skipHolidaySync: true,
    });
  }

  /**
   * Trigger sync when any configuration component is updated
   */
  async onConfigurationUpdate(contractId: string, component: string): Promise<void> {
    this.queueSync(contractId, {
      skipValidation: false,
      skipAutoInference: component !== 'contract',
      skipHolidaySync: component !== 'contract',
    });
  }

  /**
   * Force full sync for a contract
   */
  async forceSyncConfiguration(contractId: string): Promise<SyncResult> {
    return this.syncConfiguration(contractId, {
      force: true,
      skipValidation: false,
      skipAutoInference: false,
      skipHolidaySync: false,
    });
  }

  /**
   * Get sync status for a contract
   */
  async getSyncStatus(contractId: string): Promise<{
    lastSync: Date | null;
    syncInProgress: boolean;
    queuePosition: number;
  }> {
    const queuePosition = this.syncQueue.findIndex(item => item.contractId === contractId);
    
    return {
      lastSync: this.lastSyncTimestamp,
      syncInProgress: this.syncInProgress,
      queuePosition: queuePosition >= 0 ? queuePosition + 1 : 0,
    };
  }

  /**
   * Clear sync queue
   */
  clearQueue(): void {
    this.syncQueue = [];
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.syncQueue.length;
  }
}

// Export singleton instance
export const configSyncService = new ConfigSyncService();
export default configSyncService;