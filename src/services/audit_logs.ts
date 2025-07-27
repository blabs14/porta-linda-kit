import { supabase } from '../lib/supabaseClient';

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
  row_id?: string;
  old_data?: any;
  new_data?: any;
  details?: any;
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
  try {
    const auditData = {
      user_id,
      table_name,
      operation,
      row_id: row_id || null, // Permitir null se não for fornecido
      old_data: before || {},
      new_data: after || {},
      details: {
        timestamp: new Date().toISOString(),
        operation_type: operation
      }
    };
    
    return await createAuditLog(auditData);
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
    // Não falhar a operação principal se o log falhar
    return { error: null, data: null };
  }
}; 