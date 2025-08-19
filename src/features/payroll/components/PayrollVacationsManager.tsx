import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Plus, Edit, Trash2, CalendarDays, CheckCircle, Clock } from 'lucide-react';
import { PayrollVacation } from '../types';
import { payrollService } from '../services/payrollService';
import { PayrollVacationForm } from './PayrollVacationForm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PayrollVacationsManagerProps {
  year: number;
  vacations: PayrollVacation[];
  onVacationsChange: (vacations: PayrollVacation[]) => void;
}

export function PayrollVacationsManager({ year, vacations, onVacationsChange }: PayrollVacationsManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVacation, setEditingVacation] = useState<PayrollVacation | null>(null);

  useEffect(() => {
    loadVacations();
  }, [year]);

  const loadVacations = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await payrollService.getVacations(user.id, year);
      onVacationsChange(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar férias.',
        variant: 'destructive'
      });
      console.error('Error loading vacations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVacationSubmit = async (data: any) => {
    if (!user) return;
    
    try {
      if (editingVacation) {
        const updatedVacation = await payrollService.updateVacation(editingVacation.id, data);
        onVacationsChange(vacations.map(v => v.id === editingVacation.id ? updatedVacation : v));
        toast({
          title: 'Férias atualizadas',
          description: 'O período de férias foi atualizado com sucesso.'
        });
      } else {
        const newVacation = await payrollService.createVacation(user.id, data);
        onVacationsChange([...vacations, newVacation]);
        toast({
          title: 'Férias criadas',
          description: 'O período de férias foi criado com sucesso.'
        });
      }
      
      setDialogOpen(false);
      setEditingVacation(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar férias",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este período de férias?')) return;

    setLoading(true);
    try {
      await payrollService.deleteVacation(id);
      onVacationsChange(vacations.filter(v => v.id !== id));
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
      console.error('Error deleting vacation:', error);
    } finally {
      setLoading(false);
    }
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Férias
                </Button>
              </DialogTrigger>
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
                  vacation={editingVacation || undefined}
                  year={year}
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
                        onClick={() => handleDelete(vacation.id)}
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
    </Card>
  );
}