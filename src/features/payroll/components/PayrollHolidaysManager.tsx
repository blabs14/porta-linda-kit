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
import { ptBR } from 'date-fns/locale';

interface PayrollHolidaysManagerProps {
  year?: number;
}

const HOLIDAY_TYPES = [
  { value: 'national', label: 'Feriado Nacional', color: 'bg-red-100 text-red-800' },
  { value: 'regional', label: 'Feriado Regional', color: 'bg-blue-100 text-blue-800' },
  { value: 'company', label: 'Feriado da Empresa', color: 'bg-green-100 text-green-800' },
  { value: 'personal', label: 'Dia Pessoal', color: 'bg-purple-100 text-purple-800' }
];

const COMMON_HOLIDAYS = [
  { name: 'Ano Novo', date: '01-01', type: 'national' },
  { name: 'Carnaval', date: '', type: 'national', note: 'Data variável' },
  { name: 'Sexta-feira Santa', date: '', type: 'national', note: 'Data variável' },
  { name: 'Dia da Liberdade', date: '04-25', type: 'national' },
  { name: 'Dia do Trabalhador', date: '05-01', type: 'national' },
  { name: 'Corpo de Deus', date: '', type: 'national', note: 'Data variável' },
  { name: 'Dia de Portugal', date: '06-10', type: 'national' },
  { name: 'Assunção de Nossa Senhora', date: '08-15', type: 'national' },
  { name: 'Implantação da República', date: '10-05', type: 'national' },
  { name: 'Todos os Santos', date: '11-01', type: 'national' },
  { name: 'Restauração da Independência', date: '12-01', type: 'national' },
  { name: 'Imaculada Conceição', date: '12-08', type: 'national' },
  { name: 'Natal', date: '12-25', type: 'national' }
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
    loadHolidays();
  }, [year]);

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
      let savedHoliday: PayrollHoliday;
      
      if (editingHoliday?.id) {
        savedHoliday = await payrollService.updateHoliday(editingHoliday.id, formData);
        toast({
          title: 'Feriado atualizado',
          description: 'O feriado foi atualizado com sucesso.'
        });
      } else {
        savedHoliday = await payrollService.createHoliday(user.id, formData);
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

  const addCommonHoliday = (commonHoliday: typeof COMMON_HOLIDAYS[0]) => {
    if (!commonHoliday.date) {
      toast({
        title: 'Data variável',
        description: 'Este feriado tem data variável. Adicione manualmente com a data correta.',
        variant: 'default'
      });
      return;
    }

    setFormData({
      name: commonHoliday.name,
      date: `${year}-${commonHoliday.date}`,
      holiday_type: commonHoliday.type as any,
      is_paid: true,
      affects_overtime: true,
      description: ''
    });
    setDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
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
                Gestão de Feriados - {year}
              </CardTitle>
              <CardDescription>
                Configure os feriados que afetam o cálculo da folha de pagamento.
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Feriado
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingHoliday ? 'Editar Feriado' : 'Novo Feriado'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure os detalhes do feriado.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Feriado</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="holiday_type">Tipo de Feriado</Label>
                    <Select
                      value={formData.holiday_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, holiday_type: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOLIDAY_TYPES.map(type => (
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
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_paid: checked }))}
                        />
                        <span className="text-sm text-muted-foreground">
                          {formData.is_paid ? 'Sim' : 'Não'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="affects_overtime">Afeta HE</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="affects_overtime"
                          checked={formData.affects_overtime}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, affects_overtime: checked }))}
                        />
                        <span className="text-sm text-muted-foreground">
                          {formData.affects_overtime ? 'Sim' : 'Não'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Informações adicionais..."
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      {editingHoliday ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Feriados Comuns */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">Feriados Comuns de Portugal</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {COMMON_HOLIDAYS.map((holiday, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => addCommonHoliday(holiday)}
                  disabled={!holiday.date}
                  className="justify-start text-xs h-8"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {holiday.name}
                  {holiday.note && <AlertTriangle className="ml-1 h-3 w-3 text-amber-500" />}
                </Button>
              ))}
            </div>
          </div>

          {/* Lista de Feriados */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando feriados...</span>
            </div>
          ) : holidays.length === 0 ? (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Nenhum feriado configurado para {year}. Adicione feriados para melhorar o cálculo da folha de pagamento.
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
                  <TableHead>Afeta HE</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
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
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(holiday)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(holiday.id)}
                          >
                            <Trash2 className="h-3 w-3" />
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