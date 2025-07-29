import { supabase } from '../lib/supabaseClient';

// Exemplo de modelo: id, user_id, table_name, operation, row_id, old_data, new_data, details
export const getAuditLogs = async (table_name?: string): Promise<{ data: any | null; error: any }> => {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    if (table_name) query = query.eq('table_name', table_name);
    
    const { data, error } = await query;
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createAuditLog = async (data: {
  user_id: string;
  table_name: string;
  operation: string;
  row_id?: string;
  old_data?: any;
  new_data?: any;
  details?: any;
}): Promise<{ data: any | null; error: any }> => {
  try {
    const { data: result, error } = await supabase.from('audit_logs').insert(data);
    return { data: result, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Helper padronizado para registo de logs
export const logAuditChange = async (
  user_id: string,
  table_name: string,
  operation: string,
  row_id: string,
  before: any,
  after: any
): Promise<{ data: any | null; error: any }> => {
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
    return { data: null, error };
  }
}; 