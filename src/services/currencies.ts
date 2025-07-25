import { supabase } from '../lib/supabaseClient';

// Exemplo de modelo: id, code, name, symbol, rate_to_eur, updated_at
export const getCurrencies = () =>
  supabase
    .from('currencies')
    .select('*')
    .order('name', { ascending: true });

export const getCurrencyByCode = (code: string) =>
  supabase
    .from('currencies')
    .select('*')
    .eq('code', code)
    .single();

// Helper para conversão de valores
export const convertCurrency = (amount: number, fromRate: number, toRate: number) => {
  if (fromRate === 0) throw new Error('Taxa de origem inválida');
  return (amount / fromRate) * toRate;
};

// Helper para formatação de valores monetários
export const formatCurrency = (value: number, code: string) => {
  return value.toLocaleString('pt-PT', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}; 