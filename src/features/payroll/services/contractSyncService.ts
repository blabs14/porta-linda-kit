import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/shared/lib/logger';
import { holidayAutoService } from './holidayAutoService';
import { payrollService } from './payrollService';
import type { PayrollContract } from '../types';

/**
 * Serviço responsável por sincronizar todos os parâmetros obrigatórios
 * quando um novo contrato é criado
 */
export const contractSyncService = {
  /**
   * Sincroniza todos os parâmetros obrigatórios para um novo contrato
   * @param contractId - ID do contrato criado
   * @param userId - ID do utilizador
   */
  async syncAllContractParameters(contractId: string, userId: string): Promise<void> {
    logger.info('Iniciando sincronização completa de parâmetros do contrato', {
      contractId,
      userId
    });

    try {
      // 1. Obter dados do contrato
      const contract = await this.getContract(contractId, userId);
      if (!contract) {
        throw new Error(`Contrato ${contractId} não encontrado`);
      }

      // 2. Sincronizar feriados (se localização definida)
      if (contract.workplace_location) {
        await holidayAutoService.syncHolidaysForContract(contractId);
        logger.info('Feriados sincronizados com sucesso', { contractId });
      }

      // 3. Criar configurações padrão de horas extras
      await this.createDefaultOTPolicy(contractId, userId);
      logger.info('Política de horas extras padrão criada', { contractId });

      // 4. Criar configurações padrão de descontos
      await this.createDefaultDeductionConfig(contractId, userId);
      logger.info('Configuração de descontos padrão criada', { contractId });

      // 5. Criar configurações padrão de subsídio de alimentação
      await this.createDefaultMealAllowanceConfig(contractId, userId);
      logger.info('Configuração de subsídio de alimentação padrão criada', { contractId });

      // 6. Criar configurações padrão de condições de dedução
      await this.createDefaultDeductionConditions(contractId, userId);
      logger.info('Condições de dedução padrão criadas', { contractId });

      logger.info('Sincronização completa de parâmetros do contrato concluída', {
        contractId,
        userId
      });
    } catch (error) {
      logger.error('Erro na sincronização de parâmetros do contrato', {
        contractId,
        userId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  },

  /**
   * Obtém dados do contrato
   */
  async getContract(contractId: string, userId: string): Promise<PayrollContract | null> {
    try {
      return await payrollService.getContract(contractId, userId);
    } catch (error) {
      logger.error('Erro ao obter contrato', { contractId, userId, error: (error as Error).message });
      return null;
    }
  },

  /**
   * Cria política de horas extras padrão
   */
  async createDefaultOTPolicy(contractId: string, userId: string): Promise<void> {
    // Verificar se já existe uma política para este contrato
    const { data: existing } = await supabase
      .from('payroll_ot_policies')
      .select('id')
      .eq('contract_id', contractId)
      .single();

    if (existing) {
      logger.debug('Política de horas extras já existe para o contrato', { contractId });
      return;
    }

    const defaultPolicy = {
      user_id: userId,
      contract_id: contractId,
      name: 'Política Padrão',
      threshold_hours: 8.0, // 8 horas diárias antes de horas extras
      multiplier: 1.5, // Multiplicador base para horas extras
      daily_limit_hours: 2.0, // Máximo 2h extras por dia
      weekly_limit_hours: 48.0, // Limite semanal total
      annual_limit_hours: 150.0, // Limite anual padrão
      day_multiplier: 1.25, // 125% para horas extras diurnas
      night_multiplier: 1.50, // 150% para horas extras noturnas
      weekend_multiplier: 1.50, // 150% para fim de semana
      holiday_multiplier: 2.00, // 200% para feriados
      night_start: '22:00:00',
      night_end: '07:00:00',
      rounding_minutes: 15, // Arredondar para blocos de 15 minutos
      is_active: true
    };

    const { error } = await supabase
      .from('payroll_ot_policies')
      .insert(defaultPolicy);

    if (error) {
      throw new Error(`Erro ao criar política de horas extras padrão: ${error.message}`);
    }
  },

  /**
   * Cria configuração de descontos padrão
   */
  async createDefaultDeductionConfig(contractId: string, userId: string): Promise<void> {
    // Verificar se já existe configuração para este contrato
    const { data: existing } = await supabase
      .from('payroll_deduction_configs')
      .select('id')
      .eq('contract_id', contractId)
      .single();

    if (existing) {
      logger.debug('Configuração de descontos já existe para o contrato', { contractId });
      return;
    }

    // Criar configuração padrão com percentagens de IRS e Segurança Social
    const defaultConfig = {
      user_id: userId,
      contract_id: contractId,
      irs_percentage: 0.00, // Será calculado automaticamente baseado no escalão
      social_security_percentage: 11.00 // 11% padrão para trabalhador
    };

    const { error } = await supabase
      .from('payroll_deduction_configs')
      .insert(defaultConfig);

    if (error) {
      throw new Error(`Erro ao criar configurações de descontos padrão: ${error.message}`);
    }
  },

  /**
   * Cria configuração de subsídio de alimentação padrão
   */
  async createDefaultMealAllowanceConfig(contractId: string, userId: string): Promise<void> {
    // Verificar se já existe configuração para este contrato
    const { data: existing } = await supabase
      .from('payroll_meal_allowance_configs')
      .select('id')
      .eq('contract_id', contractId)
      .single();

    if (existing) {
      logger.debug('Configuração de subsídio de alimentação já existe para o contrato', { contractId });
      return;
    }

    const defaultConfig = {
      user_id: userId,
      contract_id: contractId,
      daily_amount_cents: 760, // €7.60 por dia (valor padrão 2024)
      excluded_months: [] // Nenhum mês excluído por padrão
    };

    const { error } = await supabase
      .from('payroll_meal_allowance_configs')
      .insert(defaultConfig);

    if (error) {
      throw new Error(`Erro ao criar configuração de subsídio de alimentação padrão: ${error.message}`);
    }
  },

  /**
   * Cria condições de dedução padrão
   */
  async createDefaultDeductionConditions(contractId: string, userId: string): Promise<void> {
    // Verificar se já existem condições para este contrato
    const { data: existing } = await supabase
      .from('payroll_deduction_conditions')
      .select('id')
      .eq('contract_id', contractId)
      .single();

    if (existing) {
      logger.debug('Condições de dedução já existem para o contrato', { contractId });
      return;
    }

    const defaultConditions = {
      user_id: userId,
      contract_id: contractId,
      year: new Date().getFullYear(),
      region: 'continente' as const,
      marital_status: 'single' as const,
      income_holders: 'one' as const,
      dependents: 0,
      disability_worker: false,
      disability_dependents: false,
      residency: 'resident' as const,
      overtime_rule: 'half_effective_rate' as const,
      duodecimos: false,
      meal_method: 'card' as const,
      has_adse: false,
      adse_rate: 0,
      union_rate: 0
    };

    const { error } = await supabase
      .from('payroll_deduction_conditions')
      .insert(defaultConditions);

    if (error) {
      throw new Error(`Erro ao criar condições de dedução padrão: ${error.message}`);
    }
  }
};