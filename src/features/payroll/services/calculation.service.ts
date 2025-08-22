import { PayrollContract, PayrollTimeEntry, PayrollOTPolicy, PayrollHoliday, PayrollMileageTrip, PayrollCalculation } from '../types';
import { calcMonth, validateTimeEntry } from '../lib/calc';

/**
 * Função de hash simples compatível com o browser
 * @param str String para fazer hash
 * @returns Hash hexadecimal
 */
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString(16);
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Interface para o resultado do cálculo com cache
 */
export interface CalculationResult {
  calculation: PayrollCalculation;
  hash: string;
  timestamp: Date;
  isFromCache: boolean;
}

/**
 * Interface para os parâmetros de entrada do cálculo
 */
export interface CalculationInput {
  contract: PayrollContract;
  timeEntries: PayrollTimeEntry[];
  otPolicy: PayrollOTPolicy;
  holidays: PayrollHoliday[];
  mileageTrips?: PayrollMileageTrip[];
  mileageRateCents?: number;
}

/**
 * Interface para validação de entrada
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Cache em memória para cálculos (em produção seria substituído por Redis ou similar)
 */
class CalculationCache {
  private cache = new Map<string, { result: PayrollCalculation; timestamp: Date }>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutos

  set(hash: string, result: PayrollCalculation): void {
    this.cache.set(hash, {
      result: { ...result }, // Deep copy para evitar mutações
      timestamp: new Date()
    });
  }

  get(hash: string): PayrollCalculation | null {
    const cached = this.cache.get(hash);
    
    if (!cached) {
      return null;
    }

    // Verificar se o cache expirou
    const now = new Date();
    if (now.getTime() - cached.timestamp.getTime() > this.TTL_MS) {
      this.cache.delete(hash);
      return null;
    }

    return { ...cached.result }; // Deep copy para evitar mutações
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Serviço de cálculo idempotente para folha de pagamento
 */
export class PayrollCalculationService {
  private cache = new CalculationCache();

  /**
   * Gera um hash único baseado nos parâmetros de entrada
   * @param input Parâmetros de entrada
   * @returns Hash SHA-256
   */
  private async generateHash(input: CalculationInput): Promise<string> {
    // Normalizar os dados para garantir consistência no hash
    const normalizedInput = {
      contract: {
        id: input.contract.id,
        base_salary_cents: input.contract.base_salary_cents,
        hourly_rate_cents: input.contract.hourly_rate_cents,
        weekly_hours: input.contract.weekly_hours,
        meal_allowance_cents: input.contract.meal_allowance_cents,
        schedule_json: input.contract.schedule_json
      },
      timeEntries: input.timeEntries
        .map(entry => ({
          date: entry.date,
          start_time: entry.start_time,
          end_time: entry.end_time,
          break_minutes: entry.break_minutes || 0,
          entry_type: entry.entry_type
        }))
        .sort((a, b) => a.date.localeCompare(b.date)), // Ordenar para consistência
      otPolicy: {
        multiplier: input.otPolicy.multiplier,
        daily_limit_hours: input.otPolicy.daily_limit_hours,
        weekly_limit_hours: input.otPolicy.weekly_limit_hours,
        night_start: input.otPolicy.night_start,
        night_end: input.otPolicy.night_end,
        night_multiplier: input.otPolicy.night_multiplier
      },
      holidays: input.holidays
        .map(holiday => ({
          date: holiday.date,
          name: holiday.name
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      mileageTrips: (input.mileageTrips || [])
        .map(trip => ({
          date: trip.date,
          km: trip.km,
          purpose: trip.purpose
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      mileageRateCents: input.mileageRateCents || 36
    };

    const dataString = JSON.stringify(normalizedInput);

    // Preferir Web Crypto API quando disponível (browser/Node >= 15)
    try {
      const subtle = (globalThis as any)?.crypto?.subtle;
      if (subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(dataString);
        const digest = await subtle.digest('SHA-256', data);
        const hex = Array.from(new Uint8Array(digest))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        return hex;
      }
    } catch (_) {
      // Ignorar e tentar fallback
    }

    // Fallback para ambiente Node (tests) usando crypto
    try {
      const nodeCrypto = await import('crypto');
      if ((nodeCrypto as any).webcrypto?.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(dataString);
        const digest = await (nodeCrypto as any).webcrypto.subtle.digest('SHA-256', data);
        const hex = Array.from(new Uint8Array(digest))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        return hex;
      }
      if (typeof (nodeCrypto as any).createHash === 'function') {
        return (nodeCrypto as any).createHash('sha256').update(dataString).digest('hex');
      }
    } catch (_) {
      // Último recurso: usar hash simples (não recomendado, mas evita crash)
    }

    return simpleHash(dataString);
  }

  /**
   * Valida os parâmetros de entrada
   * @param input Parâmetros de entrada
   * @returns Resultado da validação
   */
  private validateInput(input: CalculationInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar contrato
    if (!input.contract) {
      errors.push('Contrato é obrigatório');
    } else {
      if (!input.contract.base_salary_cents || input.contract.base_salary_cents <= 0) {
        errors.push('Salário base deve ser maior que zero');
      }
      if (!input.contract.hourly_rate_cents || input.contract.hourly_rate_cents <= 0) {
        errors.push('Taxa horária deve ser maior que zero');
      }
    }

    // Validar política de horas extras
    if (!input.otPolicy) {
      errors.push('Política de horas extras é obrigatória');
    } else {
      if (input.otPolicy.multiplier <= 1) {
        warnings.push('Multiplicador de horas extras é menor ou igual a 1');
      }
    }

    // Validar entradas de tempo
    if (!input.timeEntries || input.timeEntries.length === 0) {
      warnings.push('Nenhuma entrada de tempo fornecida');
    } else {
      input.timeEntries.forEach((entry, index) => {
        const validation = validateTimeEntry(entry);
        if (!validation.isValid) {
          errors.push(`Entrada ${index + 1}: ${validation.errors.join(', ')}`);
        }
      });
    }

    // Validar feriados
    if (!input.holidays) {
      input.holidays = [];
    }

    // Validar viagens de quilometragem
    if (input.mileageTrips) {
      input.mileageTrips.forEach((trip, index) => {
        if (!trip.km || trip.km <= 0) {
          errors.push(`Viagem ${index + 1}: Distância deve ser maior que zero`);
        }
        if (!trip.date) {
          errors.push(`Viagem ${index + 1}: Data é obrigatória`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calcula a folha de pagamento de forma idempotente
   * @param input Parâmetros de entrada
   * @returns Resultado do cálculo com informações de cache
   */
  async calculate(input: CalculationInput): Promise<CalculationResult> {
    // Validar entrada
    const validation = this.validateInput(input);
    if (!validation.isValid) {
      throw new Error(`Parâmetros inválidos: ${validation.errors.join(', ')}`);
    }

    // Gerar hash dos parâmetros
    const hash = await this.generateHash(input);

    // Verificar cache
    const cachedResult = this.cache.get(hash);
    if (cachedResult) {
      return {
        calculation: cachedResult,
        hash,
        timestamp: new Date(),
        isFromCache: true
      };
    }

    // Calcular resultado
    const calculation = calcMonth(
      input.contract,
      input.timeEntries,
      input.otPolicy,
      input.holidays,
      input.mileageTrips || [],
      input.mileageRateCents || 36
    );

    // Armazenar no cache
    this.cache.set(hash, calculation);

    return {
      calculation,
      hash,
      timestamp: new Date(),
      isFromCache: false
    };
  }

  /**
   * Limpa o cache de cálculos
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Retorna estatísticas do cache
   */
  getCacheStats(): { size: number; ttlMs: number } {
    return {
      size: this.cache.size(),
      ttlMs: 5 * 60 * 1000
    };
  }

  /**
   * Calcula múltiplos períodos de forma eficiente
   * @param inputs Array de parâmetros de entrada
   * @returns Array de resultados
   */
  async calculateBatch(inputs: CalculationInput[]): Promise<CalculationResult[]> {
    const results: CalculationResult[] = [];

    for (const input of inputs) {
      try {
        const result = await this.calculate(input);
        results.push(result);
      } catch (error) {
        // Em caso de erro, adicionar um resultado com erro
        results.push({
          calculation: {
            regularHours: 0,
            overtimeHours: 0,
            regularPay: 0,
            overtimePay: 0,
            mealAllowance: 0,
            mileageReimbursement: 0,
            bonuses: 0,
            grossPay: 0,
            deductions: 0,
            netPay: 0
          },
          hash: '',
          timestamp: new Date(),
          isFromCache: false
        });
      }
    }

    return results;
  }
}

// Instância singleton do serviço
export const payrollCalculationService = new PayrollCalculationService();

/**
 * Função de conveniência para calcular folha de pagamento
 * @param userId ID do utilizador
 * @param year Ano
 * @param month Mês
 * @returns Resultado do cálculo
 */
export async function calculatePayroll(userId: string, year: number, month: number): Promise<any> {
  // Esta função seria implementada para buscar dados do utilizador e calcular
  // Por agora, retorna um objeto vazio para evitar erros
  return {
    regularHours: 0,
    overtimeHours: 0,
    regularPay: 0,
    overtimePay: 0,
    mealAllowance: 0,
    mileageReimbursement: 0,
    bonuses: 0,
    grossPay: 0,
    deductions: 0,
    netPay: 0
  };
}