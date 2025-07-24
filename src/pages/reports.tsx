import { useEffect, useState } from 'react';
import { getSpendingByCategory } from '../services/reports';
import ReportChart from '../components/ReportChart';
import { Input } from '../components/ui/input';

const ReportsPage = () => {
  const [data, setData] = useState<{ categoria: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mes, setMes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await getSpendingByCategory(mes);
    if (error) setError(error.message);
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [mes]);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Relatórios de Despesas por Categoria</h1>
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