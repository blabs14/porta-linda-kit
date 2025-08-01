import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Target, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useFamily } from './FamilyProvider';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactionsQuery';
import { useAuth } from '../../contexts/AuthContext';
import { budgetSchema } from '../../validation/budgetSchema';
import { useToast } from '../../hooks/use-toast';
import { useConfirmation } from '../../hooks/useConfirmation';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';

interface BudgetFormData {
  categoria_id: string;
  valor: string;
  mes: string;
}

const FamilyBudgets: React.FC = () => {
  const { 
    familyBudgets, 
    createFamilyBudget, 
    updateFamilyBudget, 
    deleteFamilyBudget,
    isLoading,
    canEdit,
    canDelete
  } = useFamily();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<any | null>(null);
  const [form, setForm] = useState<BudgetFormData>({
    categoria_id: '',
    valor: '',
    mes: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const { user } = useAuth();
  const { toast } = useToast();
  const confirmation = useConfirmation();

  const handleNew = () => {
    setEditBudget(null);
    setForm({ categoria_id: '', valor: '', mes: '' });
    setValidationErrors({});
    setModalOpen(true);
  };

  const handleEdit = (budget: any) => {
    setEditBudget(budget);
    setForm({
      categoria_id: budget.categoria_id || '',
      valor: budget.valor?.toString() || '',
      mes: budget.mes || '',
    });
    setValidationErrors({});
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditBudget(null);
    setForm({ categoria_id: '', valor: '', mes: '' });
    setValidationErrors({});
    setIsSubmitting(false);
  };

  const handleChange = (field: keyof BudgetFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    try {
      budgetSchema.parse({
        ...form,
        valor: parseFloat(form.valor) || 0,
      });
      setValidationErrors({});
      return true;
    } catch (error: any) {
      const errors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        if (err.path) {
          errors[err.path[0]] = err.message;
        }
      });
      setValidationErrors(errors);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Utilizador não autenticado",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const budgetData = {
        categoria_id: form.categoria_id,
        valor: parseFloat(form.valor),
        mes: form.mes,
      };

      if (editBudget) {
        await updateFamilyBudget(editBudget.id, budgetData);
        toast({
          title: "Sucesso",
          description: "Orçamento familiar atualizado com sucesso",
        });
      } else {
        await createFamilyBudget(budgetData);
        toast({
          title: "Sucesso",
          description: "Orçamento familiar criado com sucesso",
        });
      }

      handleClose();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao processar o orçamento",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const budget = familyBudgets.find(b => b.id === id);
    
    confirmation.confirm(
      {
        title: 'Eliminar Orçamento Familiar',
        message: `Tem a certeza que deseja eliminar o orçamento familiar "${getCategoryName(budget?.categoria_id)}" para ${formatMonth(budget?.mes)}?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'destructive',
      },
      async () => {
        try {
          await deleteFamilyBudget(id);
          toast({
            title: 'Orçamento eliminado',
            description: 'O orçamento familiar foi eliminado com sucesso.',
          });
        } catch (error: any) {
          toast({
            title: 'Erro ao eliminar orçamento',
            description: error.message || 'Ocorreu um erro ao eliminar o orçamento.',
            variant: 'destructive',
          });
        }
      }
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const getProgressPercentage = (gasto: number, valor: number) => {
    if (valor === 0) return 0;
    return Math.min((gasto / valor) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getCategoryName = (categoriaId: string) => {
    const category = categories.find(cat => cat.id === categoriaId);
    return category?.nome || 'Categoria desconhecida';
  };

  const formatMonth = (monthString: string) => {
    if (!monthString) return '';
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  };

  const getGastoForBudget = (budget: any) => {
    // Filtrar transações do mês e categoria específicos
    const budgetTransactions = transactions.filter((transaction: any) => {
      const transactionDate = new Date(transaction.data);
      const budgetDate = new Date(budget.mes + '-01');
      
      return (
        transaction.categoria_id === budget.categoria_id &&
        transaction.family_id !== null && // Apenas transações familiares
        transactionDate.getMonth() === budgetDate.getMonth() &&
        transactionDate.getFullYear() === budgetDate.getFullYear()
      );
    });

    // Somar todos os valores das transações filtradas
    const totalGasto = budgetTransactions.reduce((sum: number, transaction: any) => {
      return sum + (Number(transaction.valor) || 0);
    }, 0);

    return totalGasto;
  };

  if (isLoading.budgets) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">A carregar orçamentos familiares...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos Familiares</h1>
          <p className="text-muted-foreground">
            Gerencie os orçamentos partilhados da família
          </p>
        </div>
        {canEdit('budget') && (
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Orçamento
          </Button>
        )}
      </div>

      {/* Content */}
      {familyBudgets.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Nenhum orçamento familiar encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Clica em "Novo Orçamento" para começar a planear as despesas familiares
          </p>
          {canEdit('budget') && (
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Orçamento
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {familyBudgets.map((budget) => {
            const gasto = getGastoForBudget(budget);
            const percentage = getProgressPercentage(gasto, budget.valor);
            const progressColor = getProgressColor(percentage);
            
            return (
              <Card key={budget.id} className="hover:shadow-md transition-shadow h-fit">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium truncate flex-1 mr-2">
                    {getCategoryName(budget.categoria_id)}
                  </CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Período</span>
                      <span className="text-sm font-medium text-blue-600">
                        {formatMonth(budget.mes)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Orçamento</span>
                      <span className="font-medium">{formatCurrency(budget.valor)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Gasto</span>
                      <span className={`font-medium ${
                        gasto === 0 ? 'text-gray-600' : 
                        gasto > budget.valor ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(gasto)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span>{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${progressColor}`}
                    />
                  </div>
                  
                  {canEdit('budget') && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(budget)}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      {canDelete('budget') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(budget.id)}
                          className="text-red-600 hover:text-red-700 flex-1"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remover
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editBudget ? 'Editar Orçamento Familiar' : 'Novo Orçamento Familiar'}</DialogTitle>
            <DialogDescription>
              {editBudget ? 'Editar dados do orçamento familiar' : 'Criar novo orçamento familiar'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={form.categoria_id} onValueChange={(value) => handleChange('categoria_id', value)}>
                <SelectTrigger>
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
              {validationErrors.categoria_id && (
                <div className="text-red-600 text-sm">{validationErrors.categoria_id}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor (€)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.valor}
                onChange={(e) => handleChange('valor', e.target.value)}
              />
              {validationErrors.valor && (
                <div className="text-red-600 text-sm">{validationErrors.valor}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mes">Mês</Label>
              <Input
                id="mes"
                type="month"
                value={form.mes}
                onChange={(e) => handleChange('mes', e.target.value)}
              />
              {validationErrors.mes && (
                <div className="text-red-600 text-sm">{validationErrors.mes}</div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editBudget ? 'A guardar...' : 'A criar...'}
                  </>
                ) : (
                  editBudget ? 'Guardar' : 'Criar'
                )}
              </Button>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        onClose={confirmation.close}
        onConfirm={confirmation.onConfirm}
        onCancel={confirmation.onCancel}
        title={confirmation.options.title}
        message={confirmation.options.message}
        confirmText={confirmation.options.confirmText}
        cancelText={confirmation.options.cancelText}
        variant={confirmation.options.variant}
      />
    </div>
  );
};

export default FamilyBudgets; 