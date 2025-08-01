import { supabase } from '../lib/supabaseClient';

export interface FamilyBackup {
  id: string;
  family_id: string;
  created_by: string;
  backup_type: string;
  status: string;
  file_path?: string | null;
  file_size?: number | null;
  metadata?: Record<string, any> | null;
  error_message?: string | null;
  created_at: string | null;
  completed_at?: string | null;
  expires_at: string | null;
}

export interface BackupStats {
  total_backups: number;
  completed_backups: number;
  failed_backups: number;
  pending_backups: number;
  total_size: number;
  latest_backup?: string;
  oldest_backup?: string;
}

export interface CreateBackupOptions {
  backup_type?: 'full' | 'incremental' | 'selective';
  metadata?: Record<string, any>;
}

/**
 * Busca todos os backups de uma família
 */
export const getFamilyBackups = async (familyId: string): Promise<FamilyBackup[]> => {
  const { data, error } = await (supabase as any)
    .from('family_backups')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FamilyBackup[];
};

/**
 * Busca estatísticas de backup de uma família
 */
export const getFamilyBackupStats = async (familyId: string): Promise<BackupStats> => {
  const { data, error } = await (supabase as any).rpc('get_family_backup_stats', {
    p_family_id: familyId
  });

  if (error) throw error;
  return data as BackupStats;
};

/**
 * Cria um novo backup da família
 */
export const createFamilyBackup = async (
  familyId: string, 
  options: CreateBackupOptions = {}
): Promise<{ success: boolean; backup_id: string; message: string }> => {
  const { data, error } = await (supabase as any).rpc('create_family_backup', {
    p_family_id: familyId,
    p_backup_type: options.backup_type || 'full',
    p_metadata: options.metadata || {}
  });

  if (error) throw error;
  return data as { success: boolean; backup_id: string; message: string };
};

/**
 * Restaura um backup da família
 */
export const restoreFamilyBackup = async (backupId: string): Promise<{ success: boolean; message: string }> => {
  const { data, error } = await (supabase as any).rpc('restore_family_backup', {
    p_backup_id: backupId
  });

  if (error) throw error;
  return data as { success: boolean; message: string };
};

/**
 * Elimina um backup
 */
export const deleteFamilyBackup = async (backupId: string): Promise<void> => {
  const { error } = await (supabase as any)
    .from('family_backups')
    .delete()
    .eq('id', backupId);

  if (error) throw error;
};

/**
 * Download de um backup (simulado - em produção seria do Supabase Storage)
 */
export const downloadFamilyBackup = async (backup: FamilyBackup): Promise<void> => {
  if (backup.status !== 'completed' || !backup.file_path) {
    throw new Error('Backup não está disponível para download');
  }

  // Em produção, aqui faríamos o download do Supabase Storage
  // Por agora, vamos simular criando um ficheiro JSON com dados simulados
  const backupData = {
    family_id: backup.family_id,
    backup_id: backup.id,
    created_at: backup.created_at,
    backup_type: backup.backup_type,
    metadata: backup.metadata,
    message: 'Este é um backup simulado. Em produção, conteria todos os dados da família.'
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
    type: 'application/json' 
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `family_backup_${backup.id}_${new Date(backup.created_at).toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Formata o tamanho do ficheiro para exibição
 */
export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Formata a data para exibição
 */
export const formatBackupDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('pt-PT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Obtém a cor do status do backup
 */
export const getBackupStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'text-green-600 bg-green-100';
    case 'processing':
      return 'text-blue-600 bg-blue-100';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'failed':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

/**
 * Obtém o texto do status do backup
 */
export const getBackupStatusText = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'Concluído';
    case 'processing':
      return 'A processar';
    case 'pending':
      return 'Pendente';
    case 'failed':
      return 'Falhou';
    default:
      return 'Desconhecido';
  }
}; 