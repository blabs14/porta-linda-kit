import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCreateTransaction, useUpdateTransaction } from '../hooks/useTransactionsQuery';
import { useReferenceData } from '../hooks/useCache';
import { useCreateCategory } from '../hooks/useCategoriesQuery';
import { transactionSchema } from '../validation/transactionSchema';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import { LoadingSpinner } from './ui/loading-states';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { useQueryClient } from '@tanstack/react-query';
import { payCreditCardFromAccount } from '../services/transactions';
import { useToast } from '../hooks/use-toast';
import { logger } from '@/shared/lib/logger';

interface TransactionFormData {
  id?: string;
  account_id: string;
  categoria_id: string;
  tipo: string;
  valor: number;
  descricao: string;
  data: string;
}

interface TransactionFormProps {
  initialData?: TransactionFormData;
  onSuccess?: (data?: TransactionFormData) => void;
  onCancel?: () => void;
  submitMode?: 'internal' | 'external';
}

const TransactionForm = ({ initialData, onSuccess, onCancel, submitMode = 'internal' }: TransactionFormProps) => {
  const { user } = useAuth();
  const { accounts, categories } = useReferenceData();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<TransactionFormData>({
    account_id: '',
    categoria_id: '',
    tipo: 'despesa',
    valor: 0,
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    ...initialData
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [operation, setOperation] = useState<'compra' | 'pagamento'>('compra');
  const [fromBankAccountId, setFromBankAccountId] = useState<string>('');
  
  // Estado para nova categoria
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6'); // Azul padrão
  
  const createTransactionMutation = useCreateTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  const createCategoryMutation = useCreateCategory();
  const isSubmitting = createTransactionMutation.isPending || updateTransactionMutation.isPending || createCategoryMutation.isPending;

  const dataLoading = accounts.isLoading || categories.isLoading;
  const accountsList = Array.isArray(accounts.data) ? accounts.data : [];
  const categoriesList = Array.isArray(categories.data) ? categories.data : [];

  const selectedAccount = accountsList.find(a => a.account_id === form.account_id);
  const isCreditCard = (accTipo?: string) => (accTipo || '').toLowerCase() === 'cartão de crédito';
  const isSelectedAccountCreditCard = isCreditCard(selectedAccount?.tipo);
  const bankLikeAccounts = accountsList.filter(a => !isCreditCard(a.tipo));

  // Verificar se a categoria já existe
  const existingCategory = categoriesList.find(cat => 
    cat.nome.toLowerCase() === newCategoryName.toLowerCase()
  );

  // Função para criar nova categoria
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || existingCategory) {
      return;
    }
    
    try {
      const newCategory = await createCategoryMutation.mutateAsync({
        nome: newCategoryName.trim(),
        cor: newCategoryColor
      });
      
      // Selecionar a nova categoria criada
      setForm(prev => ({ ...prev, categoria_id: newCategory.id }));
      setNewCategoryName('');
      setIsCreatingNewCategory(false);
    } catch (error) {
      const message = (error as { message?: string })?.message || 'Erro ao criar categoria';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    // Ao mudar a conta, se for cartão, default para 'compra'; senão limpar modo pagamento
    if (isSelectedAccountCreditCard) {
      setOperation('compra');
    } else {
      setOperation('compra');
      setFromBankAccountId('');
    }
  }, [form.account_id, isSelectedAccountCreditCard]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'valor') {
      // Permitir apenas números e vírgula/ponto
      const numericValue = value.replace(/[^\d.,-]/g, '').replace(',', '.');
      setForm(prev => ({ ...prev, [name]: numericValue ? parseFloat(numericValue) || 0 : 0 }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setValidationErrors({});
    
    // Validação do formulário
    const validationErrors: Record<string, string> = {};
    
    if (!form.account_id) {
      validationErrors.account_id = 'Conta obrigatória';
    }
    
    // Só validar categoria se não estiver a criar uma nova e não for pagamento de cartão
    if (!isSelectedAccountCreditCard && !isCreatingNewCategory && !form.categoria_id) {
      validationErrors.categoria_id = 'Categoria obrigatória';
    }
    if (isSelectedAccountCreditCard && operation === 'compra' && !isCreatingNewCategory && !form.categoria_id) {
      validationErrors.categoria_id = 'Categoria obrigatória';
    }
    if (isSelectedAccountCreditCard && operation === 'pagamento' && !fromBankAccountId) {
      validationErrors['from_bank'] = 'Conta de origem obrigatória';
    }
    
    // Se estiver a criar nova categoria, validar o nome
    if (isCreatingNewCategory && !newCategoryName.trim()) {
      validationErrors.newCategoryName = 'Nome da categoria obrigatório';
    }
    
    if (!form.valor || form.valor <= 0) {
      validationErrors.valor = 'Valor obrigatório';
    }
    
    if (!form.data) {
      validationErrors.data = 'Data obrigatória';
    }
    
    if (!form.tipo && !(isSelectedAccountCreditCard && operation === 'pagamento')) {
      validationErrors.tipo = 'Tipo obrigatório';
    }
    
    // Se há erros de validação, não prosseguir
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors(validationErrors);
      return;
    }

    try {
      // Pagamento de cartão via transferência (RPC)
      if (submitMode === 'internal' && isSelectedAccountCreditCard && operation === 'pagamento') {
        const { data, error } = await payCreditCardFromAccount(
          user?.id || '',
          form.account_id,
          fromBankAccountId,
          Math.abs(form.valor),
          form.data,
          form.descricao || undefined
        );
        if (error) {
          const message = (error as { message?: string })?.message || 'Erro ao pagar cartão';
          toast({ title: 'Erro no pagamento', description: message, variant: 'destructive' });
          setValidationErrors({ submit: message });
          return;
        }
        const efetivo = data?.amountPaid ?? 0;
        if (efetivo <= 0) {
          toast({ title: 'Sem pagamento necessário', description: 'O cartão já estava liquidado.' });
        } else if (efetivo < Math.abs(form.valor)) {
          toast({ title: 'Pagamento ajustado', description: `Foram pagos €${efetivo.toFixed(2)} (ajustado ao necessário).` });
        } else {
          toast({ title: 'Pagamento realizado', description: 'Pagamento do cartão efetuado com sucesso.' });
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['transactions'] }),
          queryClient.invalidateQueries({ queryKey: ['accountsWithBalances', user?.id] }),
          queryClient.invalidateQueries({ queryKey: ['creditCardSummary', form.account_id, user?.id] })
        ]);
        onSuccess?.();
        return;
      }

      let categoriaId = form.categoria_id;
      
      // Se está a criar uma nova categoria, criar primeiro
      if (isCreatingNewCategory && newCategoryName.trim()) {
        const newCategory = await createCategoryMutation.mutateAsync({
          nome: newCategoryName.trim(),
          cor: newCategoryColor
        });
        
        if (newCategory?.id) {
          categoriaId = newCategory.id;
        } else {
          throw new Error('Falha ao criar categoria');
        }
      }
      
      // Normalizar sinal para cartões (compra -> valor positivo, pagamento -> valor positivo)
      // O sentido é controlado pelo campo "tipo"; a BD impõe valor >= 0
      let normalizedValor = form.valor;
      if (isSelectedAccountCreditCard) {
        normalizedValor = Math.abs(form.valor);
      }

      // Preparar payload da transação
      const payload: TransactionFormData & { user_id: string } = {
        account_id: form.account_id,
        categoria_id: categoriaId,
        valor: normalizedValor,
        // Para compras no cartão, forçar 'despesa'
        tipo: isSelectedAccountCreditCard ? 'despesa' : form.tipo,
        data: form.data,
        descricao: form.descricao || '',
        user_id: user?.id || ''
      };
      
      if (submitMode === 'external') {
        onSuccess?.({ ...(payload as any), __meta: { operation, fromBankAccountId } } as any);
        return;
      }
      
      if (initialData?.id) {
        const updatePayload = {
          account_id: form.account_id,
          categoria_id: categoriaId,
          valor: normalizedValor,
          // Para compras no cartão, forçar 'despesa'
          tipo: isSelectedAccountCreditCard ? 'despesa' : form.tipo,
          data: form.data,
          descricao: form.descricao || ''
        };
        await updateTransactionMutation.mutateAsync({ id: initialData.id, data: updatePayload });
        toast({ title: 'Transação atualizada', description: 'A transação foi atualizada com sucesso.' });
      } else {
        await createTransactionMutation.mutateAsync(payload);
        toast({ title: 'Transação criada', description: isSelectedAccountCreditCard ? 'Compra no cartão registada.' : 'Transação criada com sucesso.' });
      }
      
      onSuccess?.();
    } catch (err) {
      const message = (err as { message?: string })?.message || 'Erro ao salvar transação';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      setValidationErrors({ submit: message });
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      
      <div className="space-y-2">
        <label htmlFor="account_id">Conta</label>
        <Select value={form.account_id} onValueChange={(value) => handleSelectChange('account_id', value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecionar conta" />
          </SelectTrigger>
          <SelectContent>
            {accountsList.map((account) => (
              <SelectItem key={account.account_id} value={account.account_id}>
                {account.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {validationErrors.account_id && <div className="text-red-600 text-sm">{validationErrors.account_id}</div>}
      </div>

      {isSelectedAccountCreditCard && (
        <div className="space-y-2">
          <label htmlFor="operation">Operação</label>
          <Select value={operation} onValueChange={(value) => setOperation(value as 'compra' | 'pagamento')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar operação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compra">Compra no cartão</SelectItem>
              <SelectItem value="pagamento">Pagamento (transferência)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {!isSelectedAccountCreditCard || operation === 'compra' ? (
      <div className="space-y-2">
        <label htmlFor="categoria_id">Categoria</label>
        
        {!isCreatingNewCategory ? (
          <div className="space-y-2">
            <Select value={form.categoria_id} onValueChange={(value) => handleSelectChange('categoria_id', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoriesList.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreatingNewCategory(true)}
              className="w-full"
            >
              + Criar nova categoria
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nome da nova categoria"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1"
                aria-invalid={!!validationErrors.newCategoryName}
                aria-describedby={validationErrors.newCategoryName ? 'newCategoryName-error' : undefined}
              />
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="w-12 h-10 rounded border"
                title="Cor da categoria"
              />
            </div>
            
            {validationErrors.newCategoryName && (
              <div id="newCategoryName-error" className="text-red-600 text-sm">
                {validationErrors.newCategoryName}
              </div>
            )}
            
            {existingCategory && (
              <div className="text-sm text-amber-600">
                Categoria "{existingCategory.nome}" já existe
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim() || Boolean(existingCategory) || createCategoryMutation.isPending}
                className="flex-1"
              >
                {createCategoryMutation.isPending ? 'A criar...' : 'Criar Categoria'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreatingNewCategory(false);
                  setNewCategoryName('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
        
        {validationErrors.categoria_id && <div className="text-red-600 text-sm">{validationErrors.categoria_id}</div>}
      </div>
      ) : null}

      {isSelectedAccountCreditCard && operation === 'pagamento' && (
        <div className="space-y-2">
          <label htmlFor="from_bank">Conta de origem (banco)</label>
          <Select value={fromBankAccountId} onValueChange={(value) => setFromBankAccountId(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar conta de origem" />
            </SelectTrigger>
            <SelectContent>
              {bankLikeAccounts.map((account) => (
                <SelectItem key={account.account_id} value={account.account_id}>
                  {account.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors['from_bank'] && <div className="text-red-600 text-sm">{validationErrors['from_bank']}</div>}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="tipo">Tipo</label>
        <Select value={isSelectedAccountCreditCard ? 'despesa' : form.tipo} onValueChange={(value) => handleSelectChange('tipo', value)} disabled={isSelectedAccountCreditCard}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecionar tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="despesa">Despesa</SelectItem>
            <SelectItem value="receita">Receita</SelectItem>
          </SelectContent>
        </Select>
        {validationErrors.tipo && <div className="text-red-600 text-sm">{validationErrors.tipo}</div>}
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
        <label htmlFor="descricao">Descrição (Opcional)</label>
        <Input
          id="descricao"
          name="descricao"
          placeholder="Descrição da transação"
          value={form.descricao}
          onChange={handleChange}
          className="w-full"
          aria-invalid={!!validationErrors.descricao}
          aria-describedby={validationErrors.descricao ? 'descricao-error' : undefined}
        />
        {validationErrors.descricao && <div id="descricao-error" className="text-red-600 text-sm">{validationErrors.descricao}</div>}
      </div>

      <div className="space-y-2">
        <label htmlFor="data">Data</label>
        <Input
          id="data"
          name="data"
          type="date"
          value={form.data}
          onChange={handleChange}
          required
          className="w-full"
          aria-invalid={!!validationErrors.data}
          aria-describedby={validationErrors.data ? 'data-error' : undefined}
        />
        {validationErrors.data && <div id="data-error" className="text-red-600 text-sm">{validationErrors.data}</div>}
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

export default TransactionForm;