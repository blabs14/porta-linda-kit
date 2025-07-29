import { supabase } from '../lib/supabaseClient';

/**
 * Valida dados de transação no servidor usando a Edge Function
 */
export const validateTransactionServerSide = async (data: any): Promise<{ data: any | null; error: any }> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('validate-transaction', {
      body: { transaction: data }
    });

    if (error) {
      console.error('Erro na validação server-side:', error);
      return { data: null, error };
    }

    return { data: result?.validatedData || data, error: null };
  } catch (error) {
    console.error('Erro ao chamar Edge Function:', error);
    return { data: null, error };
  }
};

/**
 * Valida dados de conta no servidor
 */
export const validateAccountServerSide = async (data: any): Promise<{ data: any | null; error: any }> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('validate-account', {
      body: { account: data }
    });

    if (error) {
      console.error('Erro na validação de conta server-side:', error);
      return { data: null, error };
    }

    return { data: result?.validatedData || data, error: null };
  } catch (error) {
    console.error('Erro ao chamar Edge Function de conta:', error);
    return { data: null, error };
  }
};

/**
 * Valida dados de categoria no servidor
 */
export const validateCategoryServerSide = async (data: any): Promise<{ data: any | null; error: any }> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('validate-category', {
      body: { category: data }
    });

    if (error) {
      console.error('Erro na validação de categoria server-side:', error);
      return { data: null, error };
    }

    return { data: result?.validatedData || data, error: null };
  } catch (error) {
    console.error('Erro ao chamar Edge Function de categoria:', error);
    return { data: null, error };
  }
}; 