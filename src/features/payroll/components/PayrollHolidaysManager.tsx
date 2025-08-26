import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Plus, Trash2, Calendar, Edit, AlertTriangle } from 'lucide-react';
import { PayrollHoliday, PayrollHolidayFormData } from '../types';
import { payrollService } from '../services/payrollService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isValid } from 'date-fns';

interface PayrollHolidaysManagerProps {
  year?: number;
}

const HOLIDAY_TYPES = [
  { value: 'national', label: 'Feriado Nacional', color: 'bg-red-100 text-red-800' },
  { value: 'regional', label: 'Feriado Regional', color: 'bg-blue-100 text-blue-800' },
  { value: 'company', label: 'Feriado da Empresa', color: 'bg-green-100 text-green-800' },
  { value: 'personal', label: 'Dia Pessoal', color: 'bg-purple-100 text-purple-800' }
];

const MANDATORY_HOLIDAYS_2025 = [
  { name: 'Ano Novo', date: '2025-01-01', type: 'national' },
  { name: 'Carnaval', date: '2025-03-04', type: 'national' },
  { name: 'Sexta-feira Santa', date: '2025-04-18', type: 'national' },
  { name: 'Dia da Liberdade', date: '2025-04-25', type: 'national' },
  { name: 'Dia do Trabalhador', date: '2025-05-01', type: 'national' },
  { name: 'Corpo de Deus', date: '2025-06-19', type: 'national' },
  { name: 'Dia de Portugal', date: '2025-06-10', type: 'national' },
  { name: 'Assunção de Nossa Senhora', date: '2025-08-15', type: 'national' },
  { name: 'Implantação da República', date: '2025-10-05', type: 'national' },
  { name: 'Todos os Santos', date: '2025-11-01', type: 'national' },
  { name: 'Restauração da Independência', date: '2025-12-01', type: 'national' },
  { name: 'Imaculada Conceição', date: '2025-12-08', type: 'national' },
  { name: 'Natal', date: '2025-12-25', type: 'national' }
];

export function PayrollHolidaysManager({ year = new Date().getFullYear() }: PayrollHolidaysManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [holidays, setHolidays] = useState<PayrollHoliday[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<PayrollHoliday | null>(null);
  const [formData, setFormData] = useState<PayrollHolidayFormData>({
    name: '',
    date: '',
    holiday_type: 'national',
    is_paid: true,
    affects_overtime: true,
    description: ''
  });

  useEffect(() => {
    if (user?.id) {
      loadHolidays();
    }
  }, [user?.id, year]);

  const loadHolidays = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await payrollService.getHolidays(user.id, year);
      setHolidays(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar feriados.',
        variant: 'destructive'
      });
      console.error('Error loading holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setLoading(true);

    try {
      if (editingHoliday?.id) {
        await payrollService.updateHoliday(editingHoliday.id, formData);
        toast({
          title: 'Feriado atualizado',
          description: 'O feriado foi atualizado com sucesso.'
        });
      } else {
        await payrollService.createHoliday(user.id, formData);
        toast({
          title: 'Feriado criado',
          description: 'O novo feriado foi criado com sucesso.'
        });
      }

      await loadHolidays();
      resetForm();
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o feriado.',
        variant: 'destructive'
      });
      console.error('Error saving holiday:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este feriado?')) return;

    setLoading(true);
    try {
      await payrollService.deleteHoliday(id);
      toast({
        title: 'Feriado excluído',
        description: 'O feriado foi excluído com sucesso.'
      });
      await loadHolidays();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir feriado.',
        variant: 'destructive'
      });
      console.error('Error deleting holiday:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      holiday_type: 'national',
      is_paid: true,
      affects_overtime: true,
      description: ''
    });
    setEditingHoliday(null);
  };

  const openEditDialog = (holiday: PayrollHoliday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: holiday.date,
      holiday_type: holiday.holiday_type,
      is_paid: holiday.is_paid,
      affects_overtime: holiday.affects_overtime,
      description: holiday.description || ''
    });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const setupMandatoryHolidays2025 = async () => {
    if (!user?.id || year !== 2025) {
      toast({
        title: 'Configuração não disponível',
        description: 'A configuração automática está disponível apenas para o ano de 2025.',
        variant: 'default'
      });
      return;
    }

    setLoading(true);
    try {
      const existingHolidays = await payrollService.getHolidays(user.id, 2025);
      const existingDates = new Set(existingHolidays.map(h => h.date));
      
      const holidaysToCreate = MANDATORY_HOLIDAYS_2025.filter(
        holiday => !existingDates.has(holiday.date)
      );

      if (holidaysToCreate.length === 0) {
        toast({
          title: 'Feriados já configurados',
          description: 'Todos os feriados obrigatórios de 2025 já estão configurados.',
          variant: 'default'
        });
        return;
      }

      const promises = holidaysToCreate.map(holiday =>
        payrollService.createHoliday(user.id, {
          name: holiday.name,
          date: holiday.date,
          holiday_type: holiday.type as any,
          is_paid: true,
          affects_overtime: true,
          description: 'Feriado obrigatório português'
        })
      );

      await Promise.all(promises);
      
      toast({
        title: 'Feriados configurados',
        description: `${holidaysToCreate.length} feriados obrigatórios de 2025 foram adicionados com sucesso.`
      });
      
      await loadHolidays();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao configurar feriados obrigatórios.',
        variant: 'destructive'
      });
      console.error('Error setting up mandatory holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, 'dd/MM/yyyy');
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }
    return dateString;
  };

  const getHolidayTypeInfo = (type: string) => {
    return HOLIDAY_TYPES.find(t => t.value === type) || HOLIDAY_TYPES[0];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Gestão de Feriados {year}
              </CardTitle>
              <CardDescription>
                Configure os feriados para cálculos de folha de pagamento
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {year === 2025 && (
                <Button
                  variant="outline"
                  onClick={setupMandatoryHolidays2025}
                  disabled={loading}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Configurar Feriados 2025
                </Button>
              )}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                 <DialogTrigger asChild>
                   <Button onClick={openNewDialog}>
                     <Plus className="h-4 w-4 mr-2" />
                     Adicionar Feriado
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="max-w-md">
                   <DialogHeader>
                     <DialogTitle>
                       {editingHoliday ? 'Editar Feriado' : 'Novo Feriado'}
                     </DialogTitle>
                     <DialogDescription>
                       Configure um novo feriado para o ano {year}
                     </DialogDescription>
                   </DialogHeader>

                   <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="space-y-2">
                       <Label htmlFor="name">Nome do Feriado</Label>
                       <Input
                         id="name"
                         value={formData.name}
                         onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                         placeholder="Ex: Natal"
                         required
                       />
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="date">Data</Label>
                       <Input
                         id="date"
                         type="date"
                         value={formData.date}
                         onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                         required
                       />
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="holiday_type">Tipo de Feriado</Label>
                       <Select
                         value={formData.holiday_type}
                         onValueChange={(value) => setFormData({ ...formData, holiday_type: value as any })}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Selecione o tipo" />
                         </SelectTrigger>
                         <SelectContent>
                           {HOLIDAY_TYPES.map((type) => (
                             <SelectItem key={type.value} value={type.value}>
                               {type.label}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label htmlFor="is_paid">Feriado Pago</Label>
                         <div className="flex items-center space-x-2">
                           <Switch
                             id="is_paid"
                             checked={formData.is_paid}
                             onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
                           />
                           <span className="text-sm text-muted-foreground">
                             {formData.is_paid ? 'Sim' : 'Não'}
                           </span>
                         </div>
                       </div>

                       <div className="space-y-2">
                         <Label htmlFor="affects_overtime">Afeta Horas Extras</Label>
                         <div className="flex items-center space-x-2">
                           <Switch
                             id="affects_overtime"
                             checked={formData.affects_overtime}
                             onCheckedChange={(checked) => setFormData({ ...formData, affects_overtime: checked })}
                           />
                           <span className="text-sm text-muted-foreground">
                             {formData.affects_overtime ? 'Sim' : 'Não'}
                           </span>
                         </div>
                       </div>
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="description">Descrição (Opcional)</Label>
                       <Input
                         id="description"
                         value={formData.description}
                         onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                         placeholder="Descrição adicional"
                       />
                     </div>

                     <div className="flex justify-end space-x-2 pt-4">
                       <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                         Cancelar
                       </Button>
                       <Button type="submit" disabled={loading}>
                         {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                         {editingHoliday ? 'Atualizar' : 'Criar'}
                       </Button>
                     </div>
                   </form>
                 </DialogContent>
               </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : holidays.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhum feriado configurado para {year}. Adicione feriados para cálculos precisos.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Nome</TableHead>
                   <TableHead>Data</TableHead>
                   <TableHead>Tipo</TableHead>
                   <TableHead>Pago</TableHead>
                   <TableHead>Afeta H.E.</TableHead>
                   <TableHead>Ações</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {holidays.map((holiday) => {
                   const typeInfo = getHolidayTypeInfo(holiday.holiday_type);
                   return (
                     <TableRow key={holiday.id}>
                       <TableCell className="font-medium">{holiday.name}</TableCell>
                       <TableCell>{formatDate(holiday.date)}</TableCell>
                       <TableCell>
                         <Badge className={typeInfo.color}>
                           {typeInfo.label}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         <Badge variant={holiday.is_paid ? 'default' : 'secondary'}>
                           {holiday.is_paid ? 'Sim' : 'Não'}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         <Badge variant={holiday.affects_overtime ? 'default' : 'secondary'}>
                           {holiday.affects_overtime ? 'Sim' : 'Não'}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         <div className="flex space-x-1">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => openEditDialog(holiday)}
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleDelete(holiday.id)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   );
                 })}
               </TableBody>
             </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}