import { useEffect, useState } from 'react';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../services/budgets';
import BudgetTable from '../components/BudgetTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const categorias = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Saúde',
  'Educação',
  'Outros',
];

const BudgetsPage = () => {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<any | null>(null);
  const [form, setForm] = useState({ categoria: '', valor: '', mes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = async () => {
    const { data } = await getBudgets();
    if (data) setBudgets(data);
  };

  useEffect(() => { fetchBudgets(); }, []);

  const handleNew = () => {
    setEditBudget(null);
    setForm({ categoria: '', valor: '', mes: '' });
    setModalOpen(true);
  };
  const handleEdit = (b: any) => {
    setEditBudget(b);
    setForm({ categoria: b.categoria, valor: b.valor.toString(), mes: b.mes });
    setModalOpen(true);
  };
  const handleClose = () => {
    setModalOpen(false);
    setEditBudget(null);
    setForm({ categoria: '', valor: '', mes: '' });
    setError(null);
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja remover este orçamento?')) return;
    await deleteBudget(id);
    fetchBudgets();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (editBudget) {
        const { error } = await updateBudget(editBudget.id, {
          categoria: form.categoria,
          valor: Number(form.valor),
          mes: form.mes,
        });
        if (error) throw error;
      } else {
        const { error } = await createBudget({
          categoria: form.categoria,
          valor: Number(form.valor),
          mes: form.mes,
        });
        if (error) throw error;
      }
      setLoading(false);
      handleClose();
      fetchBudgets();
    } catch (err: any) {
      setError(err.message || 'Erro ao guardar orçamento');
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Orçamentos</h1>
        <Button onClick={handleNew} className="w-full sm:w-auto">Novo Orçamento</Button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <BudgetTable budgets={budgets} onEdit={handleEdit} onRemove={handleRemove} />
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editBudget ? 'Editar Orçamento' : 'Novo Orçamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 p-2">
            <select name="categoria" value={form.categoria} onChange={handleChange} required className="w-full border rounded p-2">
              <option value="">Categoria</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Input name="valor" type="number" placeholder="Valor" value={form.valor} onChange={handleChange} required min={0} />
            <Input name="mes" type="month" placeholder="Mês" value={form.mes} onChange={handleChange} required />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="w-full">{loading ? 'A guardar...' : 'Guardar'}</Button>
              <Button type="button" variant="outline" onClick={handleClose} className="w-full">Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetsPage; 