import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Plus, Edit, Trash2, Check, X, AlertCircle, Coffee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLeave, PayrollLeaveFormData } from '../types';
import { payrollService } from '../services/payrollService';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { logger, withContext, maskId } from '@/shared/lib/logger';

interface CompensatoryRestManagerProps {
  contractId?: string;
}

export function CompensatoryRestManager({ contractId }: CompensatoryRestManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [compensatoryRests, setCompensatoryRests] = useState<PayrollLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRest, setEditingRest] = useState<PayrollLeave | null>(null);
  const [formData, setFormData] = useState<PayrollLeaveFormData>({
    leave_type: 'compensatory_rest',
    start_date: '',
    end_date: '',
    reason: '',
    medical_certificate: false,
    notes: ''
  });
  // Generate a per-page correlationId for traceability
  const correlationIdRef = useRef<string>('');
  if (!correlationIdRef.current) {
    correlationIdRef.current = (globalThis as any)?.crypto?.randomUUID?.() ?? `compRest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  // Contextual logger for this component
  const log = withContext({
    feature: 'payroll',
    component: 'CompensatoryRestManager',
    userId: maskId(user?.id),
    contractId: maskId(contractId),
    correlationId: correlationIdRef.current,
  });
  useEffect(() => {
    if (user?.id) {
      loadCompensatoryRests();
    }
  }, [user?.id]);

  const loadCompensatoryRests = async () => {
    try {
      setLoading(true);
      log.debug('Loading compensatory rests');
      const data = await payrollService.getLeaves(user!.id, contractId);
      // Filtrar apenas descansos compensatórios
      const compensatoryData = data.filter(leave => leave.leave_type === 'compensatory_rest');
      setCompensatoryRests(compensatoryData);
      log.info('Compensatory rests loaded', { count: compensatoryData.length });
    } catch (error) {
      log.error('Failed to load compensatory rests', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os descansos compensatórios.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;

    try {
      // Validar datas
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        log.warn('Start date must be before or equal to end date', { start_date: formData.start_date, end_date: formData.end_date });
        toast({
          title: 'Erro',
          description: 'A data de início deve ser anterior à data de fim.',
          variant: 'destructive'
        });
        return;
      }

      // Verificar sobreposição
      const hasOverlap = await payrollService.checkLeaveOverlap(
        user.id,
        formData.start_date,
        formData.end_date,
        contractId,
        editingRest?.id
      );

      if (hasOverlap) {
        log.warn('Leave period overlaps with an existing leave', { start_date: formData.start_date, end_date: formData.end_date, editingId: maskId(editingRest?.id) });
        toast({
          title: 'Erro',
          description: 'Já existe uma licença no período selecionado.',
          variant: 'destructive'
        });
        return;
      }

      // Calcular dias automaticamente
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const submitData = {
        ...formData,
        contract_id: contractId || '',
        leave_type: 'compensatory_rest',
        paid_days: totalDays, // Descanso compensatório é sempre pago
        unpaid_days: 0,
        percentage_paid: 100
      };

      log.debug('Submitting compensatory rest', { totalDays, editing: Boolean(editingRest), editingId: maskId(editingRest?.id) });
      if (editingRest) {
        await payrollService.updateLeave(editingRest.id, submitData, user.id, contractId);
        log.info('Compensatory rest updated successfully', { restId: maskId(editingRest.id) });
        toast({
          title: 'Sucesso',
          description: 'Descanso compensatório atualizado com sucesso.'
        });
      } else {
        await payrollService.createLeave(user.id, submitData);
        log.info('Compensatory rest created successfully');
        toast({
          title: 'Sucesso',
          description: 'Descanso compensatório criado com sucesso.'
        });
      }

      await loadCompensatoryRests();
      resetForm();
    } catch (error) {
      log.error('Failed to save compensatory rest', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o descanso compensatório.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await payrollService.deleteLeave(id, user?.id, contractId);
      log.info('Compensatory rest deleted successfully', { restId: maskId(id) });
      toast({
        title: 'Sucesso',
        description: 'Descanso compensatório excluído com sucesso.'
      });
      await loadCompensatoryRests();
    } catch (error) {
      log.error('Failed to delete compensatory rest', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o descanso compensatório.',
        variant: 'destructive'
      });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await payrollService.approveLeave(id, user!.id, user!.id, contractId);
      log.info('Compensatory rest approved successfully', { restId: maskId(id) });
      toast({
        title: 'Sucesso',
        description: 'Descanso compensatório aprovado com sucesso.'
      });
      await loadCompensatoryRests();
    } catch (error) {
      log.error('Failed to approve compensatory rest', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aprovar o descanso compensatório.',
        variant: 'destructive'
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await payrollService.rejectLeave(id, user!.id, user!.id, contractId);
      log.info('Compensatory rest rejected successfully', { restId: maskId(id) });
      toast({
        title: 'Sucesso',
        description: 'Descanso compensatório rejeitado com sucesso.'
      });
      await loadCompensatoryRests();
    } catch (error) {
      log.error('Failed to reject compensatory rest', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível rejeitar o descanso compensatório.',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      leave_type: 'compensatory_rest',
      start_date: '',
      end_date: '',
      reason: '',
      medical_certificate: false,
      notes: ''
    });
    setEditingRest(null);
    setDialogOpen(false);
  };

  const openEditDialog = (rest: PayrollLeave) => {
    setEditingRest(rest);
    setFormData({
      leave_type: 'compensatory_rest',
      start_date: rest.start_date,
      end_date: rest.end_date,
      paid_days: rest.paid_days,
      unpaid_days: rest.unpaid_days,
      percentage_paid: rest.percentage_paid,
      reason: rest.reason || '',
      medical_certificate: rest.medical_certificate,
      notes: rest.notes || ''
    });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    // Sugerir data de amanhã como padrão
    const tomorrow = addDays(new Date(), 1);
    setFormData(prev => ({
      ...prev,
      start_date: format(tomorrow, 'yyyy-MM-dd'),
      end_date: format(tomorrow, 'yyyy-MM-dd')
    }));
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      active: 'default',
      completed: 'outline'
    } as const;

    const labels = {
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      active: 'Ativo',
      completed: 'Concluído'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const calculateDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Descanso Compensatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              Descanso Compensatório
            </CardTitle>
            <CardDescription>
              Gestão de dias de descanso compensatório por trabalho ao domingo
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Descanso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingRest ? 'Editar Descanso Compensatório' : 'Novo Descanso Compensatório'}
                </DialogTitle>
                <DialogDescription>
                  {editingRest 
                    ? 'Atualize os dados do descanso compensatório.' 
                    : 'Preencha os dados para criar um novo descanso compensatório.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Data de Início</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Data de Fim</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Total de Dias</Label>
                  <Input
                    value={calculateDays(formData.start_date, formData.end_date)}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo/Justificação</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Ex: Trabalho ao domingo em 15/01/2025..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações adicionais..."
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingRest ? 'Atualizar' : 'Criar'} Descanso
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {compensatoryRests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum descanso compensatório registado</p>
            <p className="text-sm">Os descansos são criados automaticamente quando trabalha ao domingo</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compensatoryRests.map((rest) => (
                <TableRow key={rest.id}>
                  <TableCell>
                    <div className="text-sm">
                      <div>{format(parseISO(rest.start_date), 'dd/MM/yyyy', { locale: pt })}</div>
                      {rest.start_date !== rest.end_date && (
                        <div className="text-muted-foreground">
                          até {format(parseISO(rest.end_date), 'dd/MM/yyyy', { locale: pt })}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{rest.total_days} dia(s)</div>
                      <div className="text-muted-foreground text-xs">100% pago</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-xs truncate">
                      {rest.reason || 'Trabalho ao domingo'}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(rest.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {rest.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(rest.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(rest.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(rest)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(rest.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}