import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCreateFixedExpense, useUpdateFixedExpense } from '../hooks/useFixedExpensesQuery';
import { useCategoriesDomain } from '../hooks/useCategoriesQuery';
import { useAccounts } from '../hooks/useAccountsQuery';
import { fixedExpenseSchema } from '../validation/fixedExpenseSchema';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import { FormTransition } from './ui/transition-wrapper';
import { LoadingSpinner } from './ui/loading-states';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { logger } from '@/shared/lib/logger';

interface FixedExpenseFormData {
  id?: string;
  nome: string;
  descricao?: string;
  valor: number;
  categoria_id: string;
  account_id: string;
  dia_vencimento: number;
  ativo: boolean;
}

interface FixedExpenseFormProps {
  initialData?: FixedExpenseFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const FixedExpensesForm = ({ initialData, onSuccess, onCancel }: FixedExpenseFormProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<FixedExpenseFormData>({
    nome: '',
    descricao: '',
    valor: 0,
    categoria_id: '',
    account_id: '',
    dia_vencimento: 1,
    ativo: true,
    ...initialData
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const createFixedExpenseMutation = useCreateFixedExpense();
  const updateFixedExpenseMutation = useUpdateFixedExpense();
  const isSubmitting = createFixedExpenseMutation.isPending || updateFixedExpenseMutation.isPending;

  const { data: categories, isLoading: categoriesLoading } = useCategoriesDomain();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const dataLoading = categoriesLoading || accountsLoading;

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (name === 'valor') {
      // Permitir apenas números e vírgula/ponto
      const numericValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
      setForm(prev => ({ ...prev, [name]: numericValue ? parseFloat(numericValue) || 0 : 0 }));
    } else if (name === 'dia_vencimento') {
      const dayValue = parseInt(value);
      if (dayValue >= 1 && dayValue <= 31) {
        setForm(prev => ({ ...prev, [name]: dayValue }));
      }
    } else {
      setForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }));
    }
  };

  const handleSelectChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validação client-side com Zod
    const result = fixedExpenseSchema.safeParse(form);
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
        nome: form.nome,
        descricao: form.descricao,
        valor: form.valor,
        categoria_id: form.categoria_id,
        account_id: form.account_id,
        dia_vencimento: form.dia_vencimento,
        ativo: form.ativo,
      };
      
      if (initialData && initialData.id) {
        await updateFixedExpenseMutation.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await createFixedExpenseMutation.mutateAsync(payload);
      }
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      logger.error('Erro ao guardar despesa fixa:', err);
      // O erro já é tratado pelo hook useCrudMutation
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2">A carregar dados...</span>
      </div>
    );
  }

  return (
    <FormTransition isVisible={true}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
        <div className="space-y-2">
          <label htmlFor="nome">Nome da Despesa</label>
          <Input
            id="nome"
            name="nome"
            placeholder="Ex: Renda, Eletricidade, etc."
            value={form.nome}
            onChange={handleChange}
            required
            autoFocus
            className="w-full"
            aria-invalid={!!validationErrors.nome}
            aria-describedby={validationErrors.nome ? 'nome-error' : undefined}
          />
          {validationErrors.nome && <div id="nome-error" className="text-red-600 text-sm">{validationErrors.nome}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="descricao">Descrição (Opcional)</label>
          <Textarea
            id="descricao"
            name="descricao"
            placeholder="Descrição detalhada da despesa"
            value={form.descricao}
            onChange={handleChange}
            rows={3}
            className="w-full"
            aria-invalid={!!validationErrors.descricao}
            aria-describedby={validationErrors.descricao ? 'descricao-error' : undefined}
          />
          {validationErrors.descricao && <div id="descricao-error" className="text-red-600 text-sm">{validationErrors.descricao}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="valor">Valor (€)</label>
          <Input
            id="valor"
            name="valor"
            type="text"
            placeholder="0,00"
            value={form.valor?.toString() || '0'}
            onChange={handleChange}
            required
            className="w-full"
            aria-invalid={!!validationErrors.valor}
            aria-describedby={validationErrors.valor ? 'valor-error' : undefined}
          />
          {validationErrors.valor && <div id="valor-error" className="text-red-600 text-sm">{validationErrors.valor}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="categoria_id">Categoria</label>
          <Select value={form.categoria_id} onValueChange={(value) => handleSelectChange('categoria_id', value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.categoria_id && <div className="text-red-600 text-sm">{validationErrors.categoria_id}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="account_id">Conta</label>
          <Select value={form.account_id} onValueChange={(value) => handleSelectChange('account_id', value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar conta" />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.account_id && <div className="text-red-600 text-sm">{validationErrors.account_id}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="dia_vencimento">Dia do Vencimento</label>
          <Input
            id="dia_vencimento"
            name="dia_vencimento"
            type="number"
            min="1"
            max="31"
            placeholder="1-31"
            value={form.dia_vencimento}
            onChange={handleChange}
            required
            className="w-full"
            aria-invalid={!!validationErrors.dia_vencimento}
            aria-describedby={validationErrors.dia_vencimento ? 'dia_vencimento-error' : undefined}
          />
          {validationErrors.dia_vencimento && <div id="dia_vencimento-error" className="text-red-600 text-sm">{validationErrors.dia_vencimento}</div>}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="ativo"
            name="ativo"
            checked={form.ativo}
            onChange={handleChange}
            className="rounded border-gray-300"
          />
          <label htmlFor="ativo" className="text-sm">Despesa Ativa</label>
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
    </FormTransition>
  );
};

export default FixedExpensesForm;