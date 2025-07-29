import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import { exportReport, ExportOptions, ExportResult } from '../services/exportService';

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
          title: 'Erro ao exportar',
          description: result.error.message || 'Ocorreu um erro ao exportar o relatório',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Relatório exportado',
          description: `O relatório foi exportado com sucesso em formato ${options.format.toUpperCase()}`,
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: 'Erro ao exportar',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return { 
        data: null, 
        error: new Error(errorMessage) 
      };
    } finally {
      setIsExporting(false);
    }
  };

  const downloadReport = async (options: ExportOptions): Promise<void> => {
    const result = await exportReportData(options);
    
    if (result.data) {
      const { blob, filename } = result.data;
      
      // Criar link para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  return {
    exportReport: exportReportData,
    downloadReport,
    isExporting,
  };
}; 