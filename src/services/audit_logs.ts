import { supabase } from '../lib/supabaseClient';
import type { Database } from '../integrations/supabase/database.types';

type Json = Database['public']['Tables']['families']['Row']['settings'];

export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];

// Exemplo de modelo: id, user_id, table_name, operation, row_id, old_data, new_data, details
export const getAuditLogs = (table_name?: string) => {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false });
  if (table_name) query = query.eq('table_name', table_name);
  return query;
};

export const createAuditLog = (data: {
  user_id: string;
  table_name: string;
  operation: string;
  row_id?: string | null;
  old_data?: Json | null;
  new_data?: Json | null;
  details?: Json | null;
}) => supabase.from('audit_logs').insert(data satisfies AuditLogInsert);

// Helper padronizado para registo de logs
export const logAuditChange = async (
  user_id: string,
  table_name: string,
  operation: string,
  row_id: string | null,
  before: unknown,
  after: unknown
) => {
  try {
    const auditData: AuditLogInsert = {
      user_id: user_id ?? null,
      table_name,
      operation,
      row_id: row_id || null,
      old_data: (before as Json) ?? null,
      new_data: (after as Json) ?? null,
      details: { timestamp: new Date().toISOString(), operation_type: operation } as unknown as Json,
    };

    return await supabase.from('audit_logs').insert(auditData);
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
    return { error: null, data: null };
  }
}; 