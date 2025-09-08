import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCreateCategory, useUpdateCategory } from '../hooks/useCategoriesQuery';
import { categorySchema } from '../validation/categorySchema';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import { FormTransition } from './ui/transition-wrapper';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { logger } from '@/shared/lib/logger';

interface CategoryFormData {
  id?: string;
  nome: string;
  tipo: string;
  cor?: string;
  icone?: string;
}

interface CategoryFormProps {
  initialData?: CategoryFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CategoryForm = ({ initialData, onSuccess, onCancel }: CategoryFormProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<CategoryFormData>({
    nome: '',
    tipo: 'despesa',
    cor: '#3B82F6',
    icone: '📊',
    ...initialData
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const isSubmitting = createCategoryMutation.isPending || updateCategoryMutation.isPending;

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validação client-side com Zod
    const result = categorySchema.safeParse(form);
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
        tipo: form.tipo,
        cor: form.cor,
        icone: form.icone,
      };
      
      if (initialData && initialData.id) {
        await updateCategoryMutation.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await createCategoryMutation.mutateAsync(payload);
      }
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      logger.error('Erro ao guardar categoria:', err);
      // O erro já é tratado pelo hook useCrudMutation
    }
  };

  return (
    <FormTransition isVisible={true}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4" data-testid="category-form">
        <div className="space-y-2">
          <label htmlFor="nome">Nome</label>
          <Input
            id="nome"
            name="nome"
            placeholder="Nome da categoria"
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
          <label htmlFor="tipo">Tipo</label>
          <Select value={form.tipo} onValueChange={(value) => handleSelectChange('tipo', value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="despesa">Despesa</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="transferencia">Transferência</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.tipo && <div className="text-red-600 text-sm">{validationErrors.tipo}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="cor">Cor</label>
          <Input
            id="cor"
            name="cor"
            type="color"
            value={form.cor}
            onChange={handleChange}
            className="w-full h-12"
            aria-invalid={!!validationErrors.cor}
            aria-describedby={validationErrors.cor ? 'cor-error' : undefined}
          />
          {validationErrors.cor && <div id="cor-error" className="text-red-600 text-sm">{validationErrors.cor}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="icone">Ícone</label>
          <Input
            id="icone"
            name="icone"
            placeholder="Emoji ou ícone"
            value={form.icone}
            onChange={handleChange}
            className="w-full"
            aria-invalid={!!validationErrors.icone}
            aria-describedby={validationErrors.icone ? 'icone-error' : undefined}
          />
          {validationErrors.icone && <div id="icone-error" className="text-red-600 text-sm">{validationErrors.icone}</div>}
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

export default CategoryForm;