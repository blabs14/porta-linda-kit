import { useEffect, useState } from 'react';
import { getFixedExpenses } from '../services/fixed_expenses';

export default function FixedExpensesList() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      const { data } = await getFixedExpenses();
      setExpenses(data || []);
      setLoading(false);
    };
    fetchExpenses();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Despesas Fixas</h2>
      {loading ? (
        <div>A carregar...</div>
      ) : expenses.length === 0 ? (
        <div className="text-muted-foreground">Nenhuma despesa fixa encontrada.</div>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Valor</th>
              <th className="px-4 py-2">Dia Vencimento</th>
              <th className="px-4 py-2">Categoria</th>
              <th className="px-4 py-2">Ativa</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id}>
                <td className="border px-4 py-2">{exp.nome}</td>
                <td className="border px-4 py-2">€{exp.valor}</td>
                <td className="border px-4 py-2">{exp.dia_vencimento}</td>
                <td className="border px-4 py-2">{exp.categoria_id || '-'}</td>
                <td className="border px-4 py-2">{exp.ativa ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 