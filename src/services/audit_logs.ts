import { supabase } from '../lib/supabaseClient';

// Exemplo de modelo: id, user_id, table_name, operation, row_id, changes, created_at
export const getAuditLogs = (table_name?: string) => {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });
  if (table_name) query = query.eq('table_name', table_name);
  return query;
};

export const createAuditLog = (data: {
  user_id: string;
  table_name: string;
  operation: string;
  row_id: string;
  changes: any;
}) => supabase.from('audit_logs').insert(data);

// Helper padronizado para registo de logs
export const logAuditChange = async (
  user_id: string,
  table_name: string,
  operation: string,
  row_id: string,
  before: any,
  after: any
) => {
  const changes = { before, after };
  return createAuditLog({ user_id, table_name, operation, row_id, changes });
}; 