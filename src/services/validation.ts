import { supabase } from '../lib/supabaseClient';

export interface ValidationResult<TValidated = unknown> {
  success: boolean;
  data?: TValidated;
  errors?: string[] | null;
}

/**
 * Valida dados de transação no servidor usando a Edge Function
 */
export const validateTransactionServerSide = async <TInput = unknown, TOutput = TInput>(
  data: TInput
): Promise<ValidationResult<TOutput>> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('validate-transaction', {
      body: { transaction: data }
    });

    if (error) {
      console.error('Erro na validação server-side:', error);
      return {
        success: false,
        data: data as unknown as TOutput,
        errors: [error.message]
      };
    }

    return {
      success: true,
      data: (result?.validatedData as unknown as TOutput) ?? (data as unknown as TOutput),
      errors: (result?.errors as string[] | null) ?? null
    };
  } catch (error) {
    console.error('Erro ao chamar Edge Function:', error);
    return {
      success: false,
      data: data as unknown as TOutput,
      errors: ['Erro de comunicação com o servidor']
    };
  }
};

/**
 * Valida dados de conta no servidor
 */
export const validateAccountServerSide = async <TInput = unknown, TOutput = TInput>(
  data: TInput
): Promise<ValidationResult<TOutput>> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('validate-account', {
      body: { account: data }
    });

    if (error) {
      console.error('Erro na validação de conta server-side:', error);
      return {
        success: false,
        data: data as unknown as TOutput,
        errors: [error.message]
      };
    }

    return {
      success: true,
      data: (result?.validatedData as unknown as TOutput) ?? (data as unknown as TOutput),
      errors: (result?.errors as string[] | null) ?? null
    };
  } catch (error) {
    console.error('Erro ao chamar Edge Function de conta:', error);
    return {
      success: false,
      data: data as unknown as TOutput,
      errors: ['Erro de comunicação com o servidor']
    };
  }
};

/**
 * Valida dados de categoria no servidor
 */
export const validateCategoryServerSide = async <TInput = unknown, TOutput = TInput>(
  data: TInput
): Promise<ValidationResult<TOutput>> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('validate-category', {
      body: { category: data }
    });

    if (error) {
      console.error('Erro na validação de categoria server-side:', error);
      return {
        success: false,
        data: data as unknown as TOutput,
        errors: [error.message]
      };
    }

    return {
      success: true,
      data: (result?.validatedData as unknown as TOutput) ?? (data as unknown as TOutput),
      errors: (result?.errors as string[] | null) ?? null
    };
  } catch (error) {
    console.error('Erro ao chamar Edge Function de categoria:', error);
    return {
      success: false,
      data: data as unknown as TOutput,
      errors: ['Erro de comunicação com o servidor']
    };
  }
}; 