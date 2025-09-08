import { supabase } from '../lib/supabaseClient';
import { logger } from '../shared/lib/logger';

import type { Transaction, Account, Category, Goal } from '../integrations/supabase/types';

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: string[] | null;
}

type TransactionInput = Partial<Transaction> & {
  account_id: string;
  valor: number;
  categoria_id: string;
  data: string;
  tipo: 'receita' | 'despesa';
};

type AccountInput = Partial<Account> & {
  nome: string;
  tipo: string;
};

type CategoryInput = Partial<Category> & {
  nome: string;
  tipo?: string;
  cor?: string;
};

/**
 * Valida dados de transação no servidor usando a Edge Function
 */
export const validateTransactionServerSide = async (data: TransactionInput): Promise<ValidationResult<TransactionInput>> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('validate-transaction', {
      body: { transaction: data }
    });

    if (error) {
      logger.error('Erro na validação server-side:', error);
      return {
        success: false,
        data: data,
        errors: [error.message]
      };
    }

    return {
      success: true,
      data: result?.validatedData || data,
      errors: result?.errors || null
    };
  } catch (error) {
    logger.error('Erro ao chamar Edge Function:', error);
    return {
      success: false,
      data: data,
      errors: ['Erro de comunicação com o servidor']
    };
  }
};

/**
 * Valida dados de conta no servidor
 */
export const validateAccountServerSide = async (data: AccountInput): Promise<ValidationResult<AccountInput>> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('validate-account', {
      body: { account: data }
    });

    if (error) {
      logger.error('Erro na validação de conta server-side:', error);
      return {
        success: false,
        data: data,
        errors: [error.message]
      };
    }

    return {
      success: true,
      data: result?.validatedData || data,
      errors: result?.errors || null
    };
  } catch (error) {
    logger.error('Erro ao chamar Edge Function de conta:', error);
    return {
      success: false,
      data: data,
      errors: ['Erro de comunicação com o servidor']
    };
  }
};

/**
 * Valida dados de categoria no servidor
 */
export const validateCategoryServerSide = async (data: CategoryInput): Promise<ValidationResult<CategoryInput>> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('validate-category', {
      body: { category: data }
    });

    if (error) {
      logger.error('Erro na validação de categoria server-side:', error);
      return {
        success: false,
        data: data,
        errors: [error.message]
      };
    }

    return {
      success: true,
      data: result?.validatedData || data,
      errors: result?.errors || null
    };
  } catch (error) {
    logger.error('Erro ao chamar Edge Function de categoria:', error);
    return {
      success: false,
      data: data,
      errors: ['Erro de comunicação com o servidor']
    };
  }
};