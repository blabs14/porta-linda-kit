import { supabase } from '../lib/supabaseClient';

// Exemplo de modelo: id, code, name, symbol, rate_to_eur, updated_at
// NOTA: A tabela 'currencies' não existe no schema atual
// export const getCurrencies = async (): Promise<{ data: any | null; error: any }> => {
//   try {
//     const { data, error } = await supabase
//       .from('currencies')
//       .select('*')
//       .order('name', { ascending: true });
    
//     return { data, error };
//   } catch (error) {
//     return { data: null, error };
//   }
// };

// export const getCurrencyByCode = async (code: string): Promise<{ data: any | null; error: any }> => {
//   try {
//     const { data, error } = await supabase
//       .from('currencies')
//       .select('*')
//       .eq('code', code)
//       .single();
    
//     return { data, error };
//   } catch (error) {
//     return { data: null, error };
//   }
// };

// Helper para conversão de valores
export const convertCurrency = (amount: number, fromRate: number, toRate: number): { data: number | null; error: any } => {
  try {
    if (fromRate === 0) {
      return { data: null, error: new Error('Taxa de origem inválida') };
    }
    const result = (amount / fromRate) * toRate;
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Helper para formatação de valores monetários
export const formatCurrency = (value: number, code: string): { data: string | null; error: any } => {
  try {
    const result = value.toLocaleString('pt-PT', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
}; 