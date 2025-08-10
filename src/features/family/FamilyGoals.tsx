import React, { useState } from 'react';
import { useFamily } from './FamilyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Target, Plus, Edit, Trash2, Calendar, CheckCircle, Trophy, BarChart3 } from 'lucide-react';
import { getCategoryIcon } from '../../lib/utils';
import * as LucideIcons from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/loading-states';
import { useToast } from '../../hooks/use-toast';
import { formatCurrency } from '../../lib/utils';
import GoalForm from '../../components/GoalForm';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { useConfirmation } from '../../hooks/useConfirmation';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { useAccountsWithBalances } from '../../hooks/useAccountsQuery';
import { FormSubmitButton } from '../../components/ui/loading-button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { getAuditLogsByRow } from '../../services/audit_logs';
type AuditEntry = { id: string; timestamp: string; operation: string; old_data?: any; new_data?: any; details?: any };

const FamilyGoals: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'progress' | 'warn' | 'done'>('all');
  
  // Estados para o modal de alocação personalizado
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [allocationAmount, setAllocationAmount] = useState('');
  const [allocationDescription, setAllocationDescription] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);
  const [allocationError, setAllocationError] = useState('');
  
  // Usar o contexto familiar em vez do pessoal
  const { 
    familyGoals, 
    isLoading, 
    canEdit, 
    canDelete, 
    createFamilyGoal, 
    updateFamilyGoal, 
    deleteFamilyGoal, 
    allocateToGoal,
    refetchAll 
  } = useFamily();
  
  const { data: accounts = [] } = useAccountsWithBalances();
  const { toast } = useToast();
  const confirmation = useConfirmation();

  const handleCreateGoal = () => {
    setShowCreateModal(true);
  };

  const handleCreateSuccess = async () => {
    try {
      setShowCreateModal(false);
      refetchAll();
      toast({
        title: 'Objetivo criado',
        description: 'Objetivo familiar criado com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar objetivo familiar',
        variant: 'destructive',
      });
    }
  };

  const handleEditSuccess = async () => {
    try {
      setShowEditModal(false);
      setEditingGoal(null);
      refetchAll();
      toast({
        title: 'Objetivo atualizado',
        description: 'Objetivo familiar atualizado com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar objetivo familiar',
        variant: 'destructive',
      });
    }
  };

  const handleAllocationSuccess = () => {
    setShowAllocationModal(false);
    setSelectedGoal(null);
    setSelectedAccountId('');
    setAllocationAmount('');
    setAllocationDescription('');
    setAllocationError('');
    refetchAll();
    toast({
      title: 'Alocação realizada',
      description: 'Valor alocado com sucesso ao objetivo familiar!',
    });
  };

  const handleAllocateToGoal = (goal: any) => {
    setSelectedGoal(goal);
    setSelectedAccountId('');
    setAllocationAmount('');
    setAllocationDescription('');
    setAllocationError('');
    setShowAllocationModal(true);
  };

  const handleAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocationError('');
    setIsAllocating(true);

    if (!selectedAccountId) {
      setAllocationError('Selecione uma conta');
      setIsAllocating(false);
      return;
    }

    const numericAmount = parseFloat(allocationAmount.replace(',', '.'));
    if (!numericAmount || numericAmount <= 0) {
      setAllocationError('Insira um valor válido');
      setIsAllocating(false);
      return;
    }

    const selectedAccount = accounts.find(acc => acc.account_id === selectedAccountId);
    if (selectedAccount && numericAmount > selectedAccount.saldo_disponivel) {
      setAllocationError('Saldo insuficiente na conta selecionada');
      setIsAllocating(false);
      return;
    }

    try {
      await allocateToGoal(
        selectedGoal.id,
        numericAmount,
        selectedAccountId
      );
      
      handleAllocationSuccess();
    } catch (error: any) {
      console.error('Erro na alocação:', error);
      setAllocationError(error.message || 'Erro ao processar alocação');
    } finally {
      setIsAllocating(false);
    }
  };

  const handleAllocationAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir apenas números e vírgula/ponto
    const numericValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
    setAllocationAmount(numericValue);
  };

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal);
    setShowEditModal(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    // Encontrar o objetivo para mostrar informações específicas
    const goal = familyGoals.find((g: any) => g.id === goalId);
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
          refetchAll();
          toast({
            title: 'Objetivo eliminado',
            description: 'Objetivo familiar eliminado com sucesso!',
          });
        } catch (error) {
          toast({
            title: 'Erro',
            description: 'Erro ao eliminar objetivo familiar',
            variant: 'destructive',
          });
        }
      }
    );
  };

  const getProgressText = (progress: number) => {
    if (progress >= 100) return 'Concluído';
    if (progress >= 80) return 'Quase concluído';
    if (progress >= 50) return 'A meio caminho';
    return 'A começar';
  };

  if (isLoading.goals) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objetivos Familiares
          </h2>
          <p className="text-sm text-muted-foreground">
            Metas financeiras e objetivos de poupança partilhados pela família
          </p>
        </div>
        {canEdit('goal') && (
          <Button onClick={handleCreateGoal}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Objetivo
          </Button>
        )}
      </div>

      {/* Filtros rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Estado</Label>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="progress">Em progresso</SelectItem>
              <SelectItem value="warn">{'>'} 80%</SelectItem>
              <SelectItem value="done">Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {familyGoals
          ?.filter((g: any) => {
            const pct = Number(g.progresso_percentual) || 0;
            if (filterStatus === 'progress') return pct < 80;
            if (filterStatus === 'warn') return pct >= 80 && pct < 100;
            if (filterStatus === 'done') return pct >= 100;
            return true;
          })
          .map((goal: any) => {
          const isCompleted = (goal.progresso_percentual || 0) >= 100;
          const remaining = Math.max((goal.valor_objetivo || 0) - (goal.total_alocado || 0), 0);

          return (
            <Card 
              key={goal.id} 
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
                        (() => {
                          const iconName = getCategoryIcon(goal.nome);
                          const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Target;
                          return <IconComponent className="h-5 w-5 text-blue-600" />;
                        })()
                      )}
                      {goal.nome}
                      {!isCompleted && (Number(goal.progresso_percentual) || 0) >= 80 && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Quase</Badge>
                      )}
                    </CardTitle>
                    <div className="flex gap-1">
                      {!isCompleted && canEdit('goal') ? (
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
                      {canEdit('goal') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditGoal(goal)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete('goal') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className={`font-medium ${isCompleted ? 'text-green-600' : ''}`}>
                      {goal.progresso_percentual || 0}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(goal.progresso_percentual || 0, 100)} 
                    className={`h-2 ${isCompleted ? 'bg-green-100' : ''}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className={isCompleted ? 'text-green-600 font-medium' : ''}>
                      {isCompleted ? 'Objetivo Atingido! 🎉' : getProgressText(goal.progresso_percentual || 0)}
                    </span>
                    <span className="text-right">
                      {formatCurrency(goal.total_alocado || 0)} / {formatCurrency(goal.valor_objetivo || 0)}
                    </span>
                  </div>
                </div>

                {/* Values */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Objetivo</span>
                    <span className="font-medium">{formatCurrency(goal.valor_objetivo || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Alocado</span>
                    <span className={`font-medium ${isCompleted ? 'text-green-600' : 'text-green-600'}`}>
                      {formatCurrency(goal.total_alocado || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Restante</span>
                    <span className={`font-medium ${isCompleted ? 'text-green-600' : remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {isCompleted ? '0,00€' : formatCurrency(remaining)}
                    </span>
                  </div>
                </div>

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
                {/* Histórico de alterações (Audit Log) */}
                <Accordion type="single" collapsible className="pt-2">
                  <AccordionItem value={`hist-${goal.id}`}>
                    <AccordionTrigger>Histórico</AccordionTrigger>
                    <AccordionContent>
                      <GoalAuditList goalId={goal.id} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {(!familyGoals || familyGoals.length === 0) && (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Nenhum objetivo familiar encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Clica em "Novo Objetivo" para começar a planear as metas financeiras da família
          </p>
          {canEdit('goal') && (
            <Button onClick={handleCreateGoal}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Objetivo
            </Button>
          )}
        </div>
      )}

      {/* Create Goal Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Objetivo Familiar</DialogTitle>
            <DialogDescription>
              Cria um novo objetivo partilhado pela família
            </DialogDescription>
          </DialogHeader>
          <GoalForm
            onSuccess={() => handleCreateSuccess()}
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
            onSuccess={() => handleEditSuccess()}
            onCancel={() => {
              setShowEditModal(false);
              setEditingGoal(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Allocation Modal */}
      {showAllocationModal && selectedGoal && (
        <Dialog open={showAllocationModal} onOpenChange={setShowAllocationModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alocar Valor ao Objetivo: {selectedGoal.nome}</DialogTitle>
              <DialogDescription>
                Insira o valor a ser alocado ao objetivo familiar.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAllocationSubmit} className="space-y-4">
              <div>
                <Label htmlFor="account-select">Conta de Origem</Label>
                <Select onValueChange={setSelectedAccountId} value={selectedAccountId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.account_id} value={account.account_id}>
                        {account.nome} - Saldo: {formatCurrency(account.saldo_disponivel)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {allocationError && <p className="text-red-500 text-sm mt-1">{allocationError}</p>}
              </div>
              <div>
                <Label htmlFor="allocation-amount">Valor a Alocar</Label>
                <Input
                  id="allocation-amount"
                  type="text"
                  value={allocationAmount}
                  onChange={handleAllocationAmountChange}
                  placeholder="Ex: 100,00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="allocation-description">Descrição (Opcional)</Label>
                <Input
                  id="allocation-description"
                  type="text"
                  value={allocationDescription}
                  onChange={(e) => setAllocationDescription(e.target.value)}
                  placeholder="Ex: Alocação para objetivo"
                />
              </div>
              <div className="flex gap-2">
                <FormSubmitButton
                  isSubmitting={isAllocating}
                  submitText="Alocar Valor"
                  submittingText="A alocar..."
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAllocationModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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

const GoalAuditList: React.FC<{ goalId: string }> = ({ goalId }) => {
  const [logs, setLogs] = React.useState<AuditEntry[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [loaded, setLoaded] = React.useState<boolean>(false);

  React.useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const { data, error } = await getAuditLogsByRow('goals', goalId, 20);
        if (!active) return;
        if (error) {
          console.debug('[GoalAuditList] erro a obter logs:', error);
          setLogs([]);
        } else {
          setLogs(Array.isArray(data) ? (data as unknown as AuditEntry[]) : []);
        }
      } catch (e) {
        console.debug('[GoalAuditList] exceção a obter logs:', e);
        setLogs([]);
      } finally {
        if (active) {
          setLoading(false);
          setLoaded(true);
        }
      }
    };
    if (!loaded) fetchLogs();
    return () => { active = false; };
  }, [goalId, loaded]);

  if (loading) return <div className="text-sm text-muted-foreground">A carregar histórico...</div>;
  if (!logs.length) return <div className="text-sm text-muted-foreground">Sem histórico recente.</div>;

  return (
    <div className="space-y-2 text-sm">
      {logs.map((log) => (
        <div key={log.id} className="rounded border p-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{new Date(log.timestamp).toLocaleString('pt-PT')}</span>
            <Badge variant="outline">{log.operation}</Badge>
          </div>
          {log.old_data && log.new_data && (
            <div className="mt-1 text-xs text-muted-foreground">
              <span>Mudanças principais: </span>
              {typeof log.old_data === 'object' && typeof log.new_data === 'object' && (
                <>
                  {('valor_objetivo' in log.old_data || 'valor_objetivo' in log.new_data) && (
                    <div>Objetivo: {(log.old_data?.valor_objetivo ?? '-') } → {(log.new_data?.valor_objetivo ?? '-')}</div>
                  )}
                  {('nome' in log.old_data || 'nome' in log.new_data) && (
                    <div>Nome: {(log.old_data?.nome ?? '-') } → {(log.new_data?.nome ?? '-')}</div>
                  )}
                  {('status' in log.old_data || 'status' in log.new_data) && (
                    <div>Status: {(log.old_data?.status ?? '-') } → {(log.new_data?.status ?? '-')}</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}; 