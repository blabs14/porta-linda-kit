import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCreateBudget, useUpdateBudget } from '../hooks/useBudgetsQuery';
import { useCategoriesDomain } from '../hooks/useCategoriesQuery';
import { budgetSchema } from '../validation/budgetSchema';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import { Label } from './ui/label';
import { LoadingSpinner } from './ui/loading-states';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';

interface BudgetFormData {
  id?: string;
  categoria_id: string;
  valor_limite: number;
  periodo: string;
  mes?: number;
  ano?: number;
}

interface BudgetFormProps {
  initialData?: BudgetFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BudgetForm = ({ initialData, onSuccess, onCancel }: BudgetFormProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<BudgetFormData>({
    categoria_id: '',
    valor_limite: 0,
    periodo: 'mensal',
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    ...initialData
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const createBudgetMutation = useCreateBudget();
  const updateBudgetMutation = useUpdateBudget();
  const { data: categories = [], isLoading: categoriesLoading } = useCategoriesDomain();
  
  const isSubmitting = createBudgetMutation.isPending || updateBudgetMutation.isPending;

  useEffect(() => {
    if (initialData) {
      setForm({
        categoria_id: initialData.categoria_id || '',
        valor_limite: initialData.valor_limite || 0,
        periodo: initialData.periodo || 'mensal',
        mes: initialData.mes || new Date().getMonth() + 1,
        ano: initialData.ano || new Date().getFullYear(),
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validação client-side com Zod
    const result = budgetSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setValidationErrors(fieldErrors);
      return;
    }
    
    try {
      const payload = {
        categoria_id: form.categoria_id,
        valor: Number(form.valor_limite),
        mes: `${form.ano}-${String(form.mes).padStart(2, '0')}`,
      };
      
      if (initialData && initialData.id) {
        await updateBudgetMutation.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await createBudgetMutation.mutateAsync(payload);
      }
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Erro ao guardar orçamento:', err);
      // O erro já é tratado pelo hook useCrudMutation
    }
  };

  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <div className="space-y-2">
        <Label htmlFor="categoria_id">Categoria</Label>
        <Select value={form.categoria_id} onValueChange={(value) => handleSelectChange('categoria_id', value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecionar categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {validationErrors.categoria_id && <div className="text-destructive text-sm">{validationErrors.categoria_id}</div>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="valor_limite">Valor Limite (€)</Label>
        <Input
          id="valor_limite"
          name="valor_limite"
          type="number"
          placeholder="0.00"
          value={form.valor_limite}
          onChange={handleChange}
          required
          min="0"
          step="0.01"
          aria-invalid={!!validationErrors.valor_limite}
          aria-describedby={validationErrors.valor_limite ? 'valor_limite-error' : undefined}
        />
        {validationErrors.valor_limite && <div id="valor_limite-error" className="text-destructive text-sm">{validationErrors.valor_limite}</div>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="periodo">Período</Label>
        <Select value={form.periodo} onValueChange={(value) => handleSelectChange('periodo', value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="anual">Anual</SelectItem>
          </SelectContent>
        </Select>
        {validationErrors.periodo && <div className="text-destructive text-sm">{validationErrors.periodo}</div>}
      </div>

      {form.periodo === 'mensal' && (
        <div className="space-y-2">
          <Label htmlFor="mes">Mês</Label>
          <Select value={form.mes?.toString()} onValueChange={(value) => handleSelectChange('mes', value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Janeiro</SelectItem>
              <SelectItem value="2">Fevereiro</SelectItem>
              <SelectItem value="3">Março</SelectItem>
              <SelectItem value="4">Abril</SelectItem>
              <SelectItem value="5">Maio</SelectItem>
              <SelectItem value="6">Junho</SelectItem>
              <SelectItem value="7">Julho</SelectItem>
              <SelectItem value="8">Agosto</SelectItem>
              <SelectItem value="9">Setembro</SelectItem>
              <SelectItem value="10">Outubro</SelectItem>
              <SelectItem value="11">Novembro</SelectItem>
              <SelectItem value="12">Dezembro</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.mes && <div className="text-destructive text-sm">{validationErrors.mes}</div>}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="ano">Ano</Label>
        <Input
          id="ano"
          name="ano"
          type="number"
          placeholder="2024"
          value={form.ano}
          onChange={handleChange}
          required
          min="2020"
          max="2030"
          aria-invalid={!!validationErrors.ano}
          aria-describedby={validationErrors.ano ? 'ano-error' : undefined}
        />
        {validationErrors.ano && <div id="ano-error" className="text-destructive text-sm">{validationErrors.ano}</div>}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <FormSubmitButton 
          isSubmitting={isSubmitting}
          submitText={initialData?.id ? 'Atualizar' : 'Criar'}
          submittingText={initialData?.id ? 'A atualizar...' : 'A criar...'}
          className="w-full"
        />
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="w-full">
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
};

export default BudgetForm; 