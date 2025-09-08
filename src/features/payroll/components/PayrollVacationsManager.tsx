import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Calendar, Plus, Edit, Trash2, CalendarDays, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PayrollVacation } from '../types';
import { payrollService } from '../services/payrollService';
import { PayrollVacationForm } from './PayrollVacationForm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/shared/lib/logger';

import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PayrollVacationsManagerProps {
  year?: number;
  vacations?: PayrollVacation[];
  contractId?: string;
  onVacationsChange?: (vacations: PayrollVacation[]) => void;
}

export function PayrollVacationsManager({ year = new Date().getFullYear(), vacations: propVacations, contractId, onVacationsChange }: PayrollVacationsManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVacation, setEditingVacation] = useState<PayrollVacation | null>(null);
  const [vacations, setVacations] = useState<PayrollVacation[]>(propVacations || []);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [vacationToDelete, setVacationToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (contractId) {
      loadVacationsByContract();
    } else {
      loadVacations();
    }
  }, [year, contractId]);

  const loadVacationsByContract = async () => {
    if (!user?.id || !contractId) return;
    
    logger.debug('loadVacationsByContract called with:', { userId: user.id, contractId, year });
    
    setLoading(true);
    try {
      const data = await payrollService.getVacations(user.id, contractId, year);
      logger.debug('loadVacationsByContract received data:', data);
      setVacations(data);
      onVacationsChange?.(data);
    } catch (error) {
      logger.error('loadVacationsByContract error:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar férias.',
        variant: 'destructive'
      });

    } finally {
      setLoading(false);
    }
  };

  const loadVacations = async () => {
    if (!user?.id) return;
    
    logger.debug('loadVacations called with:', { userId: user.id, year });
    
    setLoading(true);
    try {
      const data = await payrollService.getVacations(user.id, undefined, year);
      logger.debug('loadVacations received data:', data);
      setVacations(data);
      onVacationsChange?.(data);
    } catch (error) {
      logger.error('loadVacations error:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar férias.',
        variant: 'destructive'
      });

    } finally {
      setLoading(false);
    }
  };

  const handleVacationSubmit = async (vacationData: PayrollVacation) => {
    try {
      if (editingVacation) {
        const updatedVacations = vacations.map(v => v.id === editingVacation.id ? vacationData : v);
        setVacations(updatedVacations);
        onVacationsChange?.(updatedVacations);
        toast({
          title: 'Férias atualizadas',
          description: 'O período de férias foi atualizado com sucesso.'
        });
      } else {
        const updatedVacations = [...vacations, vacationData];
        setVacations(updatedVacations);
        onVacationsChange?.(updatedVacations);
        toast({
          title: 'Férias criadas',
          description: 'O período de férias foi criado com sucesso.'
        });
      }
      
      setDialogOpen(false);
      setEditingVacation(null);
    } catch (error) {
      logger.error('Error in handleVacationSubmit:', error);
      toast({
        title: "Erro",
        description: editingVacation ? "Erro ao atualizar férias" : "Erro ao criar férias",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setVacationToDelete(id);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vacationToDelete) return;

    setLoading(true);
    try {
      await payrollService.deleteVacation(vacationToDelete, user?.id, contractId);
      const updatedVacations = vacations.filter(v => v.id !== vacationToDelete);
      setVacations(updatedVacations);
      onVacationsChange?.(updatedVacations);
      toast({
        title: 'Férias excluídas',
        description: 'O período de férias foi excluído com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir férias.',
        variant: 'destructive'
      });
      logger.error('Error deleting vacation:', error);
    } finally {
      setLoading(false);
      setVacationToDelete(null);
      setConfirmDeleteOpen(false);
    }
  };

  const handleCancelDelete = () => {
    setVacationToDelete(null);
    setConfirmDeleteOpen(false);
  };

  const openDialog = (vacation?: PayrollVacation) => {
    setEditingVacation(vacation || null);
    setDialogOpen(true);
  };

  const getTotalVacationDays = () => {
    return vacations.reduce((total, vacation) => total + vacation.days_count, 0);
  };

  const getApprovedVacationDays = () => {
    return vacations
      .filter(vacation => vacation.is_approved)
      .reduce((total, vacation) => total + vacation.days_count, 0);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'd', { locale: ptBR })} - ${format(end, 'd MMM yyyy', { locale: ptBR })}`;
    }
    
    return `${format(start, 'd MMM', { locale: ptBR })} - ${format(end, 'd MMM yyyy', { locale: ptBR })}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Gestão de Férias {year}
            </CardTitle>
            <CardDescription>
              Gerencie os períodos de férias marcados ao longo do ano.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total de dias</div>
              <div className="font-semibold">{getTotalVacationDays()} dias</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Aprovados</div>
              <div className="font-semibold text-green-600">{getApprovedVacationDays()} dias</div>
            </div>

            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Férias
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingVacation ? 'Editar Férias' : 'Adicionar Férias'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingVacation ? 'Edite o período de férias.' : 'Adicione um novo período de férias.'}
                  </DialogDescription>
                </DialogHeader>
                <PayrollVacationForm
                  vacation={editingVacation}
                  year={year}
                  contractId={contractId}
                  existingVacations={vacations}
                  onSave={handleVacationSubmit}
                  onCancel={() => setDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {vacations.length === 0 ? (
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              Nenhum período de férias configurado para {year}. Adicione períodos de férias para que sejam considerados nos cálculos da folha de pagamento.
            </AlertDescription>
          </Alert>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]" >Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vacations.map((vacation) => (
                <TableRow key={vacation.id}>
                  <TableCell className="font-medium">
                    {formatDateRange(vacation.start_date, vacation.end_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {vacation.days_count} {vacation.days_count === 1 ? 'dia' : 'dias'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {vacation.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={vacation.is_approved ? 'default' : 'secondary'}>
                      {vacation.is_approved ? (
                        <><CheckCircle className="mr-1 h-3 w-3" />Aprovado</>
                      ) : (
                        <><Clock className="mr-1 h-3 w-3" />Pendente</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(vacation)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteClick(vacation.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      
      <ConfirmationDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Excluir Período de Férias"
        message="Tem certeza que deseja excluir este período de férias? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
      />
    </Card>
  );
}