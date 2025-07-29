import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import { 
  exportReport, 
  batchExport,
  ExportOptions, 
  ExportResult,
  BatchExportOptions,
  ReportTemplate,
  ScheduledExport,
  createReportTemplate,
  getReportTemplates,
  getReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  createScheduledExport,
  getScheduledExports,
  updateScheduledExport,
  deleteScheduledExport,
  clearExpiredCache,
  clearAllCache
} from '../services/exportService';

export const useExportReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const exportReportData = async (options: ExportOptions): Promise<ExportResult> => {
    if (!user) {
      return {
        data: null,
        error: new Error('Utilizador não autenticado')
      };
    }
    
    setIsExporting(true);
    try {
      const result = await exportReport(user.id, options);
      
      if (result.error) {
        toast({
          title: 'Erro na exportação',
          description: result.error.message || 'Ocorreu um erro ao exportar o relatório',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Exportação concluída',
          description: 'Relatório exportado com sucesso',
        });
      }
      
      return result;
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive'
      });
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido')
      };
    } finally {
      setIsExporting(false);
    }
  };

  const batchExportReports = async (options: BatchExportOptions) => {
    if (!user) {
      return {
        data: null,
        error: new Error('Utilizador não autenticado')
      };
    }
    
    setIsExporting(true);
    try {
      const result = await batchExport(user.id, options);
      
      if (result.error) {
        toast({
          title: 'Erro na exportação em lote',
          description: result.error.message || 'Ocorreu um erro ao exportar os relatórios',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Exportação em lote concluída',
          description: `${result.data?.filenames.length || 0} relatórios exportados com sucesso`,
        });
      }
      
      return result;
    } catch (error) {
      toast({
        title: 'Erro na exportação em lote',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive'
      });
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido')
      };
    } finally {
      setIsExporting(false);
    }
  };

  return { 
    exportReportData, 
    batchExportReports,
    isExporting 
  };
};

export const useReportTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const createTemplate = async (template: Omit<ReportTemplate, 'id' | 'userId'>) => {
    if (!user) {
      return { data: null, error: new Error('Utilizador não autenticado') };
    }

    try {
      const result = await createReportTemplate(user.id, template);
      
      if (result.error) {
        toast({
          title: 'Erro ao criar template',
          description: result.error.message || 'Ocorreu um erro ao criar o template',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Template criado',
          description: 'Template criado com sucesso',
        });
      }
      
      return result;
    } catch (error) {
      toast({
        title: 'Erro ao criar template',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive'
      });
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido')
      };
    }
  };

  const getTemplates = async () => {
    if (!user) {
      return { data: null, error: new Error('Utilizador não autenticado') };
    }

    try {
      return await getReportTemplates(user.id);
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido')
      };
    }
  };

  const getTemplate = async (templateId: string) => {
    if (!user) {
      return { data: null, error: new Error('Utilizador não autenticado') };
    }

    try {
      return await getReportTemplate(user.id, templateId);
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido')
      };
    }
  };

  const updateTemplate = async (templateId: string, updates: Partial<ReportTemplate>) => {
    if (!user) {
      return { data: null, error: new Error('Utilizador não autenticado') };
    }

    try {
      const result = await updateReportTemplate(user.id, templateId, updates);
      
      if (result.error) {
        toast({
          title: 'Erro ao atualizar template',
          description: result.error.message || 'Ocorreu um erro ao atualizar o template',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Template atualizado',
          description: 'Template atualizado com sucesso',
        });
      }
      
      return result;
    } catch (error) {
      toast({
        title: 'Erro ao atualizar template',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive'
      });
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido')
      };
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!user) {
      return { data: null, error: new Error('Utilizador não autenticado') };
    }

    try {
      const result = await deleteReportTemplate(user.id, templateId);
      
      if (result.error) {
        toast({
          title: 'Erro ao eliminar template',
          description: result.error.message || 'Ocorreu um erro ao eliminar o template',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Template eliminado',
          description: 'Template eliminado com sucesso',
        });
      }
      
      return result;
    } catch (error) {
      toast({
        title: 'Erro ao eliminar template',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive'
      });
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido')
      };
    }
  };

  return {
    createTemplate,
    getTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate
  };
};

export const useScheduledExports = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const createScheduled = async (scheduledExport: Omit<ScheduledExport, 'id' | 'userId'>) => {
    if (!user) {
      return { data: null, error: new Error('Utilizador não autenticado') };
    }

    try {
      const result = await createScheduledExport(user.id, scheduledExport);
      
      if (result.error) {
        toast({
          title: 'Erro ao criar exportação agendada',
          description: result.error.message || 'Ocorreu um erro ao criar a exportação agendada',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Exportação agendada criada',
          description: 'Exportação agendada criada com sucesso',
        });
      }
      
      return result;
    } catch (error) {
      toast({
        title: 'Erro ao criar exportação agendada',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive'
      });
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido')
      };
    }
  };

  const getScheduled = async () => {
    if (!user) {
      return { data: null, error: new Error('Utilizador não autenticado') };
    }

    try {
      return await getScheduledExports(user.id);
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido')
      };
    }
  };

  const updateScheduled = async (scheduledExportId: string, updates: Partial<ScheduledExport>) => {
    if (!user) {
      return { data: null, error: new Error('Utilizador não autenticado') };
    }

    try {
      const result = await updateScheduledExport(user.id, scheduledExportId, updates);
      
      if (result.error) {
        toast({
          title: 'Erro ao atualizar exportação agendada',
          description: result.error.message || 'Ocorreu um erro ao atualizar a exportação agendada',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Exportação agendada atualizada',
          description: 'Exportação agendada atualizada com sucesso',
        });
      }
      
      return result;
    } catch (error) {
      toast({
        title: 'Erro ao atualizar exportação agendada',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive'
      });
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido')
      };
    }
  };

  const deleteScheduled = async (scheduledExportId: string) => {
    if (!user) {
      return { data: null, error: new Error('Utilizador não autenticado') };
    }

    try {
      const result = await deleteScheduledExport(user.id, scheduledExportId);
      
      if (result.error) {
        toast({
          title: 'Erro ao eliminar exportação agendada',
          description: result.error.message || 'Ocorreu um erro ao eliminar a exportação agendada',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Exportação agendada eliminada',
          description: 'Exportação agendada eliminada com sucesso',
        });
      }
      
      return result;
    } catch (error) {
      toast({
        title: 'Erro ao eliminar exportação agendada',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive'
      });
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido')
      };
    }
  };

  return {
    createScheduled,
    getScheduled,
    updateScheduled,
    deleteScheduled
  };
};

export const useExportCache = () => {
  const { toast } = useToast();

  const clearExpired = () => {
    try {
      clearExpiredCache();
      toast({
        title: 'Cache limpo',
        description: 'Cache expirado limpo com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro ao limpar cache',
        description: 'Ocorreu um erro ao limpar o cache',
        variant: 'destructive'
      });
    }
  };

  const clearAll = () => {
    try {
      clearAllCache();
      toast({
        title: 'Cache limpo',
        description: 'Todo o cache foi limpo com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro ao limpar cache',
        description: 'Ocorreu um erro ao limpar o cache',
        variant: 'destructive'
      });
    }
  };

  return {
    clearExpired,
    clearAll
  };
}; 