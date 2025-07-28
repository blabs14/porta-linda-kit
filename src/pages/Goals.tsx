import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { useGoals } from '../hooks/useGoalsQuery';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { GoalAllocationModal } from '../components/GoalAllocationModal';
import { Loader2, Plus, Edit, Trash2, Target, CheckCircle, Trophy } from 'lucide-react';
import { goalSchema } from '../validation/goalSchema';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

export default function Goals() {
  const { 
    goals, 
    isLoading: loading, 
    createGoal, 
    updateGoal, 
    deleteGoal,
    isCreating,
    isUpdating,
    isDeleting
  } = useGoals();
  const { user } = useAuth();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [form, setForm] = useState({
    nome: '',
    valor_objetivo: '',
    valor_atual: '',
    prazo: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNew = () => {
    setEditGoal(null);
    setForm({ nome: '', valor_objetivo: '', valor_atual: '', prazo: '' });
    setErrors({});
    setShowModal(true);
  };

  const handleEdit = (goal: any) => {
    setEditGoal(goal);
    setForm({
      nome: goal.nome,
      valor_objetivo: goal.valor_objetivo.toString(),
      valor_atual: goal.valor_atual.toString(),
      prazo: goal.prazo
    });
    setErrors({});
    setShowModal(true);
  };

  const handleAllocate = (goal: any) => {
    setSelectedGoal(goal);
    setShowAllocationModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditGoal(null);
    setForm({ nome: '', valor_objetivo: '', valor_atual: '', prazo: '' });
    setErrors({});
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    try {
      const validationData: any = {
        nome: form.nome,
        valor_objetivo: parseFloat(form.valor_objetivo),
        prazo: form.prazo
      };
      
      // Se estiver editando, incluir valor_atual na validação
      if (editGoal) {
        validationData.valor_atual = parseFloat(form.valor_atual);
      }
      
      goalSchema.parse(validationData);
      setErrors({});
      return true;
    } catch (error: any) {
      const newErrors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        newErrors[err.path[0]] = err.message;
      });
      setErrors(newErrors);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Goals: handleSubmit chamado');

    if (!validateForm()) {
      console.log('❌ Validação falhou');
      return;
    }

    console.log('✅ Validação passou, dados do formulário:', form);

    try {
      const payload = {
        nome: form.nome,
        valor_objetivo: Number(form.valor_objetivo),
        prazo: form.prazo
      };

      // Se estiver editando, incluir valor_atual no payload
      if (editGoal) {
        payload.valor_atual = Number(form.valor_atual);
      }

      console.log('Payload preparado:', payload);

      if (editGoal) {
        console.log('🔍 Atualizando objetivo existente...');
        await updateGoal({ id: editGoal.id, data: payload });
        console.log('✅ Objetivo atualizado com sucesso');
        toast({
          title: 'Objetivo atualizado',
          description: 'Objetivo atualizado com sucesso!',
        });
      } else {
        console.log('🔍 Criando novo objetivo...');
        await createGoal(payload);
        console.log('✅ Objetivo criado com sucesso');
        toast({
          title: 'Objetivo criado',
          description: 'Objetivo criado com sucesso!',
        });
      }

      handleClose();
    } catch (error) {
      console.error('❌ Erro ao salvar objetivo:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar objetivo. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (goalId: string) => {
    if (window.confirm('Tem certeza que deseja eliminar este objetivo?')) {
      try {
        await deleteGoal(goalId);
        toast({
          title: 'Objetivo eliminado',
          description: 'Objetivo eliminado com sucesso!',
        });
      } catch (error) {
        console.error('Erro ao eliminar objetivo:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao eliminar objetivo. Tente novamente.',
          variant: 'destructive'
        });
      }
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 80) return 'bg-yellow-500';
    if (progress >= 50) return 'bg-blue-500';
    return 'bg-gray-300';
  };

  const getProgressText = (progress: number) => {
    if (progress >= 100) return 'Concluído';
    if (progress >= 80) return 'Quase concluído';
    if (progress >= 50) return 'A meio caminho';
    return 'A começar';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Objetivos</h1>
          <p className="text-muted-foreground">Gerencie os seus objetivos financeiros</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Objetivo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto items-start">
        {goals.map((goal: any) => {
          const progress = goal.valor_objetivo > 0 ? (goal.valor_atual / goal.valor_objetivo) * 100 : 0;
          const remaining = Math.max(goal.valor_objetivo - goal.valor_atual, 0);
          const isCompleted = progress >= 100;

          return (
            <Card key={goal.id} className={`hover:shadow-lg transition-shadow h-fit w-full ${isCompleted ? 'border-green-200 bg-green-50' : ''}`}>
              <CardHeader>
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2">
                      {isCompleted ? (
                        <Trophy className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <Target className="h-5 w-5 text-blue-600" />
                      )}
                      {goal.nome}
                    </CardTitle>
                    <div className="flex gap-1">
                      {!isCompleted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAllocate(goal)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="h-8 w-8 p-0 opacity-50 cursor-not-allowed"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Objetivo já atingido! Edite o valor objetivo ou atual para continuar.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(goal)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(goal.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {isCompleted && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 w-fit">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Atingido
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className={`font-medium ${isCompleted ? 'text-green-600' : ''}`}>
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(progress, 100)} 
                    className={`h-2 ${isCompleted ? 'bg-green-100' : ''}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className={isCompleted ? 'text-green-600 font-medium' : ''}>
                      {isCompleted ? 'Objetivo Atingido! 🎉' : getProgressText(progress)}
                    </span>
                    <span className="text-right">
                      {formatCurrency(goal.valor_atual)} / {formatCurrency(goal.valor_objetivo)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Objetivo</span>
                    <span className="font-medium">{formatCurrency(goal.valor_objetivo)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Alocado</span>
                    <span className={`font-medium ${isCompleted ? 'text-green-600' : 'text-green-600'}`}>
                      {formatCurrency(goal.valor_atual)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Restante</span>
                    <span className={`font-medium ${isCompleted ? 'text-green-600' : remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {isCompleted ? '0,00€' : formatCurrency(remaining)}
                    </span>
                  </div>
                  {goal.prazo && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Prazo</span>
                      <span className="font-medium text-sm">{formatDate(goal.prazo)}</span>
                    </div>
                  )}
                </div>

                {isCompleted && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-medium">Parabéns! Objetivo atingido com sucesso!</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1 leading-relaxed">
                      Para continuar a alocar valores, edite o objetivo e aumente o valor alvo ou reduza o valor atual.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">Nenhum objetivo criado</h3>
          <p className="text-muted-foreground mb-4">Crie o seu primeiro objetivo financeiro para começar a poupar.</p>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeiro Objetivo
          </Button>
        </div>
      )}

      {/* Modal para criar/editar objetivo */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editGoal ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle>
            <DialogDescription>
              {editGoal ? 'Edite os detalhes do objetivo.' : 'Crie um novo objetivo financeiro.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Objetivo</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Ex: Viagem à Europa"
                className={errors.nome ? 'border-red-500' : ''}
              />
              {errors.nome && <p className="text-sm text-red-500">{errors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_objetivo">Valor Objetivo</Label>
              <Input
                id="valor_objetivo"
                type="number"
                step="0.01"
                min="0.01"
                value={form.valor_objetivo}
                onChange={(e) => handleChange('valor_objetivo', e.target.value)}
                placeholder="0,00"
                className={errors.valor_objetivo ? 'border-red-500' : ''}
              />
              {errors.valor_objetivo && <p className="text-sm text-red-500">{errors.valor_objetivo}</p>}
            </div>

            {/* Campo valor_atual apenas quando estiver editando */}
            {editGoal && (
              <div className="space-y-2">
                <Label htmlFor="valor_atual">Valor Atual (Alocado)</Label>
                <Input
                  id="valor_atual"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor_atual}
                  onChange={(e) => handleChange('valor_atual', e.target.value)}
                  placeholder="0,00"
                  className={errors.valor_atual ? 'border-red-500' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Ajuste o valor já alocado para este objetivo. Isso afetará o progresso mostrado.
                </p>
                {errors.valor_atual && <p className="text-sm text-red-500">{errors.valor_atual}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="prazo">Data Limite</Label>
              <Input
                id="prazo"
                type="date"
                value={form.prazo}
                onChange={(e) => handleChange('prazo', e.target.value)}
                className={errors.prazo ? 'border-red-500' : ''}
              />
              {errors.prazo && <p className="text-sm text-red-500">{errors.prazo}</p>}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A guardar...
                  </>
                ) : (
                  editGoal ? 'Atualizar' : 'Criar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para alocar valor */}
      {selectedGoal && (
        <GoalAllocationModal
          isOpen={showAllocationModal}
          onClose={() => {
            setShowAllocationModal(false);
            setSelectedGoal(null);
          }}
          goalId={selectedGoal.id}
          goalName={selectedGoal.nome}
        />
      )}
    </div>
  );
}