import type { Transaction } from '../../integrations/supabase/types';

export type TransactionDomain = {
  id: string;
  account_id: string;
  categoria_id: string;
  tipo: string;
  valor: number;
  descricao?: string | null;
  data: string; // YYYY-MM-DD
  created_at?: string | null;
  goal_id?: string | null;
};

export function mapTransactionRowToDomain(row: Transaction): TransactionDomain {
  const anyRow = row as unknown as Record<string, unknown>;
  return {
    id: String(anyRow.id),
    account_id: String(anyRow.account_id),
    categoria_id: String(anyRow.categoria_id),
    tipo: String(anyRow.tipo ?? ''),
    valor: Number(anyRow.valor ?? 0),
    descricao: typeof anyRow.descricao === 'string' ? (anyRow.descricao as string) : null,
    data: String(anyRow.data ?? ''),
    created_at: typeof anyRow.created_at === 'string' ? (anyRow.created_at as string) : null,
    goal_id: typeof anyRow.goal_id === 'string' ? (anyRow.goal_id as string) : null,
  };
} 