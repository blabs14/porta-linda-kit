import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useFamily } from './FamilyProvider';
import { useToast } from '../../hooks/use-toast';
import { formatCurrency } from '../../lib/utils';
import { Target, Plus, Edit, Trash2, Calendar, CheckCircle, Trophy } from 'lucide-react';
import { GoalAllocationModal } from '../../components/GoalAllocationModal';
import GoalForm from '../../components/GoalForm';
import { GoalProgress } from '../../integrations/supabase/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { useConfirmation } from '../../hooks/useConfirmation';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';

const FamilyGoals: React.FC = () => {
  const { 
    familyGoals, 
    createFamilyGoal, 
    updateFamilyGoal, 
    deleteFamilyGoal,
    allocateToGoal,
    isLoading,
    canEdit,
    canDelete
  } = useFamily();
  
  const { toast } = useToast();
  const confirmation = useConfirmation();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalProgress | null>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  // Simular goalProgress para objetivos familiares (baseado nos dados disponíveis)
  const goalProgress = familyGoals.map(goal => ({
    goal_id: goal.id,
    nome: goal.nome,
    valor_objetivo: goal.valor_objetivo,
    total_alocado: goal.valor_atual || 0,
    progresso_percentual: ((goal.valor_atual || 0) / goal.valor_objetivo) * 100,
    prazo: goal.prazo,
    ativa: goal.ativa
  }));

  const handleCreateGoal = () => {
    setShowCreateModal(true);
  };

  const handleAllocationSuccess = () => {
    setShowAllocationModal(false);
    setSelectedGoal(null);
    toast({
      title: 'Alocação realizada',
      description: 'Valor alocado com sucesso ao objetivo familiar!',
    });
  };

  const handleAllocateToGoal = (goal: GoalProgress) => {
    setSelectedGoal(goal);
    setShowAllocationModal(true);
  };

  const handleEditGoal = (goal: any) => {
    // Buscar os dados completos do objetivo
    const fullGoal = familyGoals.find(g => g.id === goal.goal_id);
    if (fullGoal) {
      setEditingGoal(fullGoal);
      setShowEditModal(true);
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do objetivo',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    // Encontrar o objetivo para mostrar informações específicas
    const goal = goalProgress.find(g => g.goal_id === goalId);
    const isCompleted = goal?.progresso_percentual >= 100;
    
    let message = 'Tem a certeza que deseja eliminar este objetivo familiar? Esta ação não pode ser desfeita.';
    
    if (goal) {
      if (isCompleted) {
        message = `O objetivo familiar "${goal.nome}" foi atingido a 100%. Ao eliminar, o valor alocado (${formatCurrency(goal.total_alocado)}) será mantido na conta objetivos e não será restituído à conta original.`;
      } else {
        message = `O objetivo familiar "${goal.nome}" está a ${goal.progresso_percentual}%. Ao eliminar, o valor alocado (${formatCurrency(goal.total_alocado)}) será restituído ao saldo disponível da conta original.`;
      }
    }
    
    confirmation.confirm(
      {
        title: 'Eliminar Objetivo Familiar',
        message: message,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'destructive',
      },
      async () => {
        try {
          await deleteFamilyGoal(goalId);
          
          toast({
            title: 'Objetivo eliminado',
            description: `O objetivo familiar "${goal?.nome}" foi eliminado com sucesso.`,
          });
        } catch (error: any) {
          toast({
            title: 'Erro ao eliminar objetivo',
            description: error.message || 'Ocorreu um erro ao eliminar o objetivo.',
            variant: 'destructive',
          });
        }
      }
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 80) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getProgressText = (progress: number) => {
    if (progress >= 100) return 'Concluído';
    if (progress >= 80) return 'Quase concluído';
    if (progress >= 50) return 'A meio caminho';
    return 'A começar';
  };

  if (isLoading.goals) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">A carregar objetivos familiares...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Objetivos Familiares</h1>
          <p className="text-muted-foreground">
            Gerencie os objetivos financeiros partilhados da família
          </p>
        </div>
        {canEdit('goal') && (
          <Button onClick={handleCreateGoal}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Objetivo
          </Button>
        )}
      </div>

      {/* Goals Grid */}
      {goalProgress.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Nenhum objetivo familiar encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Cria o primeiro objetivo familiar para começar a poupar em conjunto
          </p>
          {canEdit('goal') && (
            <Button onClick={handleCreateGoal}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Objetivo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goalProgress.map((goal) => {
            const isCompleted = goal.progresso_percentual >= 100;
            const remaining = Math.max(goal.valor_objetivo - goal.total_alocado, 0);

            return (
              <Card 
                key={goal.goal_id} 
                className={`hover:shadow-lg transition-shadow ${
                  isCompleted ? 'border-green-200 bg-green-50' : ''
                }`}
              >
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
                      {canEdit('goal') && (
                        <div className="flex gap-1">
                          {!isCompleted ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAllocateToGoal(goal)}
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
                                  <p>Objetivo já atingido! Edite o valor objetivo ou o valor atual para continuar.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditGoal(goal)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {canDelete('goal') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteGoal(goal.goal_id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
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
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className={`font-medium ${isCompleted ? 'text-green-600' : ''}`}>
                        {goal.progresso_percentual.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(goal.progresso_percentual, 100)} 
                      className={`h-2 ${isCompleted ? 'bg-green-100' : ''}`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className={isCompleted ? 'text-green-600 font-medium' : ''}>
                        {isCompleted ? 'Objetivo Atingido! 🎉' : getProgressText(goal.progresso_percentual)}
                      </span>
                      <span className="text-right">
                        {formatCurrency(goal.total_alocado)} / {formatCurrency(goal.valor_objetivo)}
                      </span>
                    </div>
                  </div>

                  {/* Values */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Objetivo</span>
                      <span className="font-medium">{formatCurrency(goal.valor_objetivo)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Alocado</span>
                      <span className={`font-medium ${isCompleted ? 'text-green-600' : 'text-green-600'}`}>
                        {formatCurrency(goal.total_alocado)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Restante</span>
                      <span className={`font-medium ${isCompleted ? 'text-green-600' : remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {isCompleted ? '0,00€' : formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>

                  {/* Prazo */}
                  {goal.prazo && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Prazo: {formatDate(goal.prazo)}</span>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium">Parabéns! Objetivo familiar atingido com sucesso!</span>
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
      )}

      {/* Create Goal Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Objetivo Familiar</DialogTitle>
            <DialogDescription>
              Cria um novo objetivo financeiro familiar
            </DialogDescription>
          </DialogHeader>
                     <GoalForm
             onSuccess={async () => {
               try {
                 // O GoalForm já chama createGoal internamente
                 toast({
                   title: 'Objetivo criado',
                   description: 'O objetivo familiar foi criado com sucesso.',
                 });
                 setShowCreateModal(false);
               } catch (error: any) {
                 toast({
                   title: 'Erro',
                   description: error.message || 'Ocorreu um erro ao criar o objetivo.',
                   variant: 'destructive',
                 });
               }
             }}
             onCancel={() => setShowCreateModal(false)}
           />
        </DialogContent>
      </Dialog>

      {/* Edit Goal Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Objetivo Familiar</DialogTitle>
            <DialogDescription>
              Edita os dados do objetivo familiar
            </DialogDescription>
          </DialogHeader>
                     <GoalForm
             initialData={editingGoal}
             onSuccess={async () => {
               try {
                 // O GoalForm já chama updateGoal internamente
                 toast({
                   title: 'Objetivo atualizado',
                   description: 'O objetivo familiar foi atualizado com sucesso.',
                 });
                 setShowEditModal(false);
                 setEditingGoal(null);
               } catch (error: any) {
                 toast({
                   title: 'Erro',
                   description: error.message || 'Ocorreu um erro ao atualizar o objetivo.',
                   variant: 'destructive',
                 });
               }
             }}
             onCancel={() => {
               setShowEditModal(false);
               setEditingGoal(null);
             }}
           />
        </DialogContent>
      </Dialog>

      {/* Allocation Modal */}
      {selectedGoal && (
        <GoalAllocationModal
          isOpen={showAllocationModal}
          onClose={handleAllocationSuccess}
          goalId={selectedGoal.goal_id}
          goalName={selectedGoal.nome}
          currentProgress={selectedGoal.total_alocado}
          targetAmount={selectedGoal.valor_objetivo}
        />
      )}

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

export default FamilyGoals; 