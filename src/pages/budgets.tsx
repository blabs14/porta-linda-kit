import { useEffect, useState } from 'react';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../services/budgets';
import BudgetTable from '../components/BudgetTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { budgetSchema } from '../validation/budgetSchema';
import { showError } from '../lib/utils';

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
  const [form, setForm] = useState({ categoria_id: '', valor: '', mes: '' });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const fetchBudgets = async () => {
    const { data } = await getBudgets();
    if (data) setBudgets(data);
  };

  useEffect(() => { fetchBudgets(); }, []);

  const handleNew = () => {
    setEditBudget(null);
    setForm({ categoria_id: '', valor: '', mes: '' });
    setModalOpen(true);
  };
  const handleEdit = (b: any) => {
    setEditBudget(b);
    setForm({ categoria_id: b.categoria_id, valor: b.valor.toString(), mes: b.mes });
    setModalOpen(true);
  };
  const handleClose = () => {
    setModalOpen(false);
    setEditBudget(null);
    setForm({ categoria_id: '', valor: '', mes: '' });
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
    setValidationErrors({});
    setLoading(true);
    const result = budgetSchema.safeParse({
      categoria_id: form.categoria_id,
      valor: form.valor,
      mes: form.mes,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setValidationErrors(fieldErrors);
      setLoading(false);
      return;
    }
    try {
      if (editBudget) {
        const { error } = await updateBudget(editBudget.id, {
          categoria_id: form.categoria_id,
          valor: Number(form.valor),
          mes: form.mes,
        });
        if (error) throw error;
      } else {
        const { error } = await createBudget({
          categoria_id: form.categoria_id,
          valor: Number(form.valor),
          mes: form.mes,
        });
        if (error) throw error;
      }
      setLoading(false);
      handleClose();
      fetchBudgets();
    } catch (err: any) {
      showError(err.message || 'Erro ao guardar orçamento');
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
            <select name="categoria_id" value={form.categoria_id} onChange={handleChange} required className="w-full border rounded p-2">
              <option value="">Categoria</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {validationErrors.categoria_id && <div className="text-red-600 text-sm">{validationErrors.categoria_id}</div>}
            <Input name="valor" type="number" placeholder="Valor" value={form.valor} onChange={handleChange} required min={0}
              aria-invalid={!!validationErrors.valor}
              aria-describedby={validationErrors.valor ? 'valor-error' : undefined}
            />
            {validationErrors.valor && <div id="valor-error" className="text-red-600 text-sm">{validationErrors.valor}</div>}
            <Input name="mes" type="month" placeholder="Mês" value={form.mes} onChange={handleChange} required
              aria-invalid={!!validationErrors.mes}
              aria-describedby={validationErrors.mes ? 'mes-error' : undefined}
            />
            {validationErrors.mes && <div id="mes-error" className="text-red-600 text-sm">{validationErrors.mes}</div>}
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