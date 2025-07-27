import { useEffect, useState } from 'react';
import { getExpensesByCategory } from '../services/reports';
import ReportChart from '../components/ReportChart';
import { Input } from '../components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { ReportExport } from '../components/ReportExport';

const ReportsPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<{ categoria: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mes, setMes] = useState('');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await getExpensesByCategory(user.id, mes || undefined);
    if (error) setError(error.message);
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [mes, user]);

  const handleExport = async (format: string, dateRange: { start: string; end: string }) => {
    if (!user) return;
    
    try {
      const { exportReport } = await import('../services/exportService');
      const { blob, filename } = await exportReport(user.id, {
        format: format as 'pdf' | 'csv' | 'excel',
        dateRange,
      });
      
      // Criar link para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      throw error;
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Relatórios de Despesas por Categoria</h1>
        <ReportExport onExport={handleExport} />
      </div>
      <div className="mb-4 flex flex-col sm:flex-row gap-2 items-center">
        <label htmlFor="mes" className="font-medium">Mês:</label>
        <Input id="mes" type="month" value={mes} onChange={e => setMes(e.target.value)} className="w-full sm:w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div>A carregar...</div>
        ) : error ? (
          <div className="text-red-600">Erro: {error}</div>
        ) : (
          <ReportChart data={data} />
        )}
      </div>
    </div>
  );
};

export default ReportsPage; 