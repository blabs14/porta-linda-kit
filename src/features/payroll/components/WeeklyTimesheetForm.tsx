import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, Save, Upload, Download, Calendar, Trash2, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { PayrollTimeEntry, PayrollContract, TimesheetEntry, WeeklyTimesheet } from '../types';
import { payrollService } from '../services/payrollService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { calculateHours } from '../lib/calc';

interface WeeklyTimesheetFormProps {
  initialWeekStart?: Date;
  contractId?: string;
  onSave?: (entries: PayrollTimeEntry[]) => void;
}

export function WeeklyTimesheetForm({ initialWeekStart, contractId, onSave }: WeeklyTimesheetFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contracts, setContracts] = useState<PayrollContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState(contractId || '');
  const [selectedWeek, setSelectedWeek] = useState(
    (initialWeekStart || new Date()).toISOString().split('T')[0]
  );
  const [timesheet, setTimesheet] = useState<WeeklyTimesheet>({ entries: [] });
  const [existingEntries, setExistingEntries] = useState<PayrollTimeEntry[]>([]);

  // Função para calcular o número da semana
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Gerar os 7 dias da semana
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(selectedWeek);
    date.setDate(date.getDate() + i);
    return date;
  });

  const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  useEffect(() => {
    loadContracts();
  }, []);

  useEffect(() => {
    if (selectedContractId) {
      loadExistingEntries();
    }
  }, [selectedContractId, selectedWeek]);

  const loadContracts = async () => {
    if (!user?.id) return;
    
    try {
      const data = await payrollService.getContracts(user.id);
      const activeContracts = data.filter(c => c.is_active);
      setContracts(activeContracts);
      
      if (!selectedContractId && activeContracts.length > 0) {
        setSelectedContractId(activeContracts[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os contratos.',
        variant: 'destructive',
      });
    }
  };

  const loadExistingEntries = async () => {
    if (!selectedContractId || !user?.id) return;

    setLoading(true);
    try {
      const weekEnd = new Date(selectedWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const entries = await payrollService.getTimeEntries(
      user.id,
      selectedWeek,
      weekEnd.toISOString().split('T')[0]
    );
      
      setExistingEntries(entries);
      
      // Converter entradas existentes para formato de timesheet
      const timesheetEntries: TimesheetEntry[] = weekDays.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayEntries = entries.filter(e => 
          e.date === dateStr
        );
        
        if (dayEntries.length > 0) {
          const entry = dayEntries[0];
          return {
        date: dateStr,
        startTime: entry.start_time || '',
        endTime: entry.end_time || '',
        breakMinutes: entry.break_minutes || 0,
        description: entry.description || '',
        isHoliday: entry.is_holiday || false,
        isSick: entry.is_sick || false,
        isVacation: false,
        isException: false
      };
        }
        
        return {
        date: dateStr,
        startTime: '',
        endTime: '',
        breakMinutes: 0,
        description: '',
        isHoliday: false,
        isSick: false,
        isVacation: false,
        isException: false
      };
      });
      
      setTimesheet({ entries: timesheetEntries });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar entradas de tempo.',
        variant: 'destructive'
      });
      console.error('Error loading time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (index: number, field: keyof TimesheetEntry, value: any) => {
    const newEntries = [...timesheet.entries];
    const entry = { ...newEntries[index] };
    
    // Aplicar precedências: feriado > férias > doente
    if (field === 'isHoliday' && value) {
      // Feriado tem precedência sobre tudo
      entry.isVacation = false;
      entry.isSick = false;
      // Limpar horas se não for exceção
      if (!entry.isException) {
        entry.startTime = '';
        entry.endTime = '';
        entry.breakMinutes = 0;
      }
    } else if (field === 'isVacation' && value) {
      // Férias só pode ser marcado se não for feriado
      if (!entry.isHoliday) {
        entry.isSick = false;
        // Limpar horas se não for exceção
        if (!entry.isException) {
          entry.startTime = '';
          entry.endTime = '';
          entry.breakMinutes = 0;
        }
      } else {
        // Não permitir marcar férias se já for feriado
        return;
      }
    } else if (field === 'isSick' && value) {
      // Doente só pode ser marcado se não for feriado nem férias
      if (!entry.isHoliday && !entry.isVacation) {
        // Limpar horas se não for exceção
        if (!entry.isException) {
          entry.startTime = '';
          entry.endTime = '';
          entry.breakMinutes = 0;
        }
      } else {
        // Não permitir marcar doente se já for feriado ou férias
        return;
      }
    } else if (field === 'isException') {
      // isException permite editar horas mesmo em feriados/férias/doente
      entry[field] = value;
    } else {
      entry[field] = value;
    }
    
    newEntries[index] = entry;
    setTimesheet({ entries: newEntries });
  };



  const fillNormalWeek = () => {
    if (!selectedContract?.schedule_json) {
      toast({
        title: 'Erro',
        description: 'Contrato selecionado não possui horário definido.',
        variant: 'destructive'
      });
      return;
    }

    const schedule = selectedContract.schedule_json;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    const newEntries: TimesheetEntry[] = weekDays.map((date, index) => {
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayName = dayNames[dayOfWeek];
      const daySchedule = schedule[dayName];
      
      // Verificar se o dia tem horário definido (start e end não são null)
      if (daySchedule && daySchedule.start && daySchedule.end) {
        return {
           date: dateStr,
           startTime: daySchedule.start,
           endTime: daySchedule.end,
           breakMinutes: daySchedule.break_minutes || 0,
           description: '',
           isHoliday: false,
           isSick: false,
           isVacation: false,
           isException: false
         };
      } else {
         return {
           date: dateStr,
           startTime: '',
           endTime: '',
           breakMinutes: 0,
           description: '',
           isHoliday: false,
           isSick: false,
           isVacation: false,
           isException: false
         };
       }
    });

    setTimesheet({ entries: newEntries });
    
    toast({
      title: 'Sucesso',
      description: 'Semana preenchida com horário normal do contrato.'
    });
  };

  // Apagar entrada individual de um dia específico
  const clearDayEntry = async (index: number) => {
    const entry = timesheet.entries[index];
    const dateStr = entry.date;
    
    // Encontrar entrada existente para este dia
    const existingEntry = existingEntries.find(e => 
      e.date.toISOString().split('T')[0] === dateStr
    );
    
    if (existingEntry) {
      try {
        await payrollService.deleteTimeEntry(existingEntry.id, user?.id, selectedContractId);
        toast({
          title: 'Entrada apagada',
          description: 'A entrada de tempo foi apagada com sucesso.'
        });
        // Recarregar entradas
        await loadExistingEntries();
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao apagar entrada de tempo.',
          variant: 'destructive'
        });
        console.error('Error deleting time entry:', error);
      }
    } else {
      // Se não existe entrada salva, apenas limpar localmente
      const newEntries = [...timesheet.entries];
      newEntries[index] = {
        date: dateStr,
        startTime: '',
        endTime: '',
        breakMinutes: 0,
        description: '',
        isHoliday: false,
        isSick: false,
        isVacation: false,
        isException: false
      };
      setTimesheet({ entries: newEntries });
    }
  };

  // Apagar todas as entradas da semana
  const clearWeekEntries = async () => {
    if (!confirm('Tem certeza que deseja apagar todas as entradas de tempo desta semana?')) {
      return;
    }
    
    setLoading(true);
    try {
      // Apagar todas as entradas existentes da semana
      for (const existingEntry of existingEntries) {
        await payrollService.deleteTimeEntry(existingEntry.id, user?.id, selectedContractId);
      }
      
      toast({
        title: 'Entradas apagadas',
        description: 'Todas as entradas de tempo da semana foram apagadas.'
      });
      
      // Recarregar entradas
      await loadExistingEntries();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao apagar entradas de tempo.',
        variant: 'destructive'
      });
      console.error('Error deleting week entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDayHours = (entry: TimesheetEntry): number => {
    if (!entry.startTime || !entry.endTime || (entry.isHoliday && !entry.isException) || (entry.isSick && !entry.isException) || (entry.isVacation && !entry.isException)) {
      return 0;
    }
    
    const start = new Date(`${entry.date}T${entry.startTime}`);
    const end = new Date(`${entry.date}T${entry.endTime}`);
    
    if (end <= start) {
      return 0;
    }
    
    const totalMinutes = calculateHours(start, end, 0) * 60;
    const workMinutes = totalMinutes - (entry.breakMinutes || 0);
    
    return Math.max(0, workMinutes / 60);
  };

  const calculateWeekTotal = (): number => {
    return timesheet.entries.reduce((total, entry) => {
      return total + calculateDayHours(entry);
    }, 0);
  };

  const validateTimesheet = (): string[] => {
    const errors: string[] = [];
    
    if (!selectedContractId) {
      errors.push('Selecione um contrato.');
    }
    
    timesheet.entries.forEach((entry, index) => {
      if (entry.startTime && entry.endTime) {
        const start = new Date(`${entry.date}T${entry.startTime}`);
        const end = new Date(`${entry.date}T${entry.endTime}`);
        
        if (end <= start) {
          errors.push(`Dia ${index + 1}: Hora de fim deve ser posterior à hora de início.`);
        }
      }
      
      if ((entry.startTime && !entry.endTime) || (!entry.startTime && entry.endTime)) {
        errors.push(`Dia ${index + 1}: Preencha tanto a hora de início quanto a de fim.`);
      }
    });
    
    return errors;
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    const errors = validateTimesheet();
    if (errors.length > 0) {
      toast({
        title: 'Erro de Validação',
        description: errors.join(' '),
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // Converter timesheet entries para PayrollTimeEntry
      const timeEntries: Omit<PayrollTimeEntry, 'id' | 'created_at' | 'updated_at'>[] = 
        timesheet.entries
          .filter(entry => entry.startTime || entry.endTime || entry.isHoliday || entry.isSick)
          .map(entry => ({
            contract_id: selectedContractId,
            date: new Date(entry.date),
            start_time: entry.startTime || null,
            end_time: entry.endTime || null,
            break_minutes: entry.breakMinutes || 0,
            description: entry.notes || null,
            is_holiday: entry.isHoliday || false,
            is_sick: entry.isSick || false,
            is_vacation: entry.isVacation || false
          }));

      // Deletar entradas existentes da semana
      for (const existingEntry of existingEntries) {
        await payrollService.deleteTimeEntry(existingEntry.id, user?.id, selectedContractId);
      }

      // Criar novas entradas
      const savedEntries: PayrollTimeEntry[] = [];
      for (const entry of timeEntries) {
        const saved = await payrollService.createTimeEntry(user.id, selectedContractId!, entry);
        savedEntries.push(saved);
      }

      // Processar descanso compensatório para trabalho ao domingo
      try {
        const compensatoryLeaves = await payrollService.processCompensatoryRestForTimeEntries(
          user.id,
          selectedContractId!,
          savedEntries
        );
        
        if (compensatoryLeaves.length > 0) {
          toast({
            title: 'Descanso Compensatório Criado',
            description: `${compensatoryLeaves.length} dia(s) de descanso compensatório foram atribuídos automaticamente por trabalho ao domingo.`,
            duration: 5000
          });
        }
      } catch (error) {
        console.error('Erro ao processar descanso compensatório:', error);
        // Não bloquear o salvamento por erro no descanso compensatório
      }

      toast({
        title: 'Timesheet Salvo',
        description: `${savedEntries.length} entradas de tempo foram salvas.`
      });

      onSave?.(savedEntries);
      await loadExistingEntries();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar timesheet.',
        variant: 'destructive'
      });
      console.error('Error saving timesheet:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados.');
      }

      // Assumir formato: data,inicio,fim,pausa_minutos,notas,feriado,doente
      const entries: TimesheetEntry[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const [date, startTime, endTime, breakMinutes, notes, isHoliday, isSick, isException] = 
          lines[i].split(',').map(s => s.trim());
        
        if (date) {
          entries.push({
            date,
            startTime: startTime || '',
            endTime: endTime || '',
            breakMinutes: parseInt(breakMinutes) || 0,
            description: notes || '',
            isHoliday: isHoliday === 'true' || isHoliday === '1',
            isSick: isSick === 'true' || isSick === '1',
            isVacation: false, // Não importar férias do CSV por agora
            isException: isException === 'true' || isException === '1'
          });
        }
      }

      setTimesheet({ entries });
      
      toast({
        title: 'CSV Importado',
        description: `${entries.length} entradas foram importadas.`
      });
    } catch (error) {
      toast({
        title: 'Erro de Importação',
        description: 'Erro ao importar arquivo CSV.',
        variant: 'destructive'
      });
      console.error('Error importing CSV:', error);
    }
    
    // Reset input
    event.target.value = '';
  };

  const exportToCSV = () => {
    const headers = ['data', 'inicio', 'fim', 'pausa_minutos', 'notas', 'feriado', 'doente', 'ferias', 'excecao'];
    const rows = timesheet.entries.map(entry => [
      entry.date,
      entry.startTime,
      entry.endTime,
      entry.breakMinutes.toString(),
      entry.description,
      entry.isHoliday ? '1' : '0',
      entry.isSick ? '1' : '0',
      entry.isVacation ? '1' : '0',
      entry.isException ? '1' : '0'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheet_${selectedWeek}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const weekTotal = calculateWeekTotal();
  const selectedContract = contracts.find(c => c.id === selectedContractId);
  const standardWeeklyHours = selectedContract ? (selectedContract.weekly_hours || 40) : 40;
  const overtimeHours = Math.max(0, weekTotal - standardWeeklyHours);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Carregando timesheet...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-6 w-6" />
                Timesheet Semanal
              </CardTitle>
              <CardDescription>
                Semana de {weekDays[0].toLocaleDateString('pt-PT')} a {weekDays[6].toLocaleDateString('pt-PT')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
                id="csv-import"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('csv-import')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV
              </Button>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Seleção de Contrato */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="contract">Contrato</Label>
              <Select value={selectedContractId || ''} onValueChange={setSelectedContractId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            <div>
              <Label>Total da Semana</Label>
              <div className="text-2xl font-bold text-blue-600">
                {weekTotal.toFixed(2)}h
              </div>
            </div>
            <div>
              <Label>Horas Extras</Label>
              <div className={`text-2xl font-bold ${
                overtimeHours > 0 ? 'text-amber-600' : 'text-green-600'
              }`}>
                {overtimeHours.toFixed(2)}h
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timesheet Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Entradas de Tempo</CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => {
                    const currentDate = new Date(selectedWeek);
                    currentDate.setDate(currentDate.getDate() - 7);
                    setSelectedWeek(currentDate.toISOString().split('T')[0]);
                  }}
                  variant="outline" 
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  Semana {getWeekNumber(new Date(selectedWeek))}
                </span>
                <Button 
                  onClick={() => {
                    const currentDate = new Date(selectedWeek);
                    currentDate.setDate(currentDate.getDate() + 7);
                    setSelectedWeek(currentDate.toISOString().split('T')[0]);
                  }}
                  variant="outline" 
                  size="sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={fillNormalWeek} 
                variant="default" 
                size="sm"
                disabled={!selectedContract?.schedule_json}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Preencher Semana Normal
              </Button>
              <Button 
                onClick={clearWeekEntries} 
                variant="destructive" 
                size="sm"
                disabled={loading || existingEntries.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Apagar Semana
              </Button>

            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Dia</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Pausa (min)</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Exceção</TableHead>
                  <TableHead>Feriado</TableHead>
                  <TableHead>Férias</TableHead>
                  <TableHead>Doente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[50px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheet.entries.map((entry, index) => {
                  const dayHours = calculateDayHours(entry);
                  const dayIndex = weekDays.findIndex(d => 
                    d.toISOString().split('T')[0] === entry.date
                  );
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={entry.date}
                          onValueChange={(value) => updateEntry(index, 'date', value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {weekDays.map((day, i) => (
                              <SelectItem key={i} value={day.toISOString().split('T')[0]}>
                                {day.toLocaleDateString('pt-PT')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {dayIndex >= 0 ? dayNames[dayIndex] : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={entry.startTime}
                          onChange={(e) => updateEntry(index, 'startTime', e.target.value)}
                          disabled={(entry.isHoliday || entry.isSick || entry.isVacation) && !entry.isException}
                          className="w-[120px]"
                          aria-label="Hora de início"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={entry.endTime}
                          onChange={(e) => updateEntry(index, 'endTime', e.target.value)}
                          disabled={(entry.isHoliday || entry.isSick || entry.isVacation) && !entry.isException}
                          className="w-[120px]"
                          aria-label="Hora de fim"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={entry.breakMinutes}
                          onChange={(e) => updateEntry(index, 'breakMinutes', parseInt(e.target.value) || 0)}
                          disabled={(entry.isHoliday || entry.isSick || entry.isVacation) && !entry.isException}
                          className="w-[80px]"
                          aria-label="Minutos de pausa"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={dayHours > 8 ? 'destructive' : 'default'}>
                            {dayHours.toFixed(2)}h
                          </Badge>
                          {entry.isHoliday && (
                            <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                              Feriado
                            </Badge>
                          )}
                          {entry.isVacation && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                              Férias
                            </Badge>
                          )}
                          {entry.isSick && (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                              Doente
                            </Badge>
                          )}
                          {entry.isException && (
                            <Badge variant="outline" className="text-xs">
                              Exceção
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={entry.isException || false}
                          onChange={(e) => updateEntry(index, 'isException', e.target.checked)}
                          className="h-4 w-4"
                          aria-label="Marcar como exceção ao horário normal"
                          title="Permite editar horas mesmo em feriados/férias/doente"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={entry.isHoliday}
                          onChange={(e) => updateEntry(index, 'isHoliday', e.target.checked)}
                          className="h-4 w-4"
                          aria-label="Marcar como feriado"
                          title="Feriado (precedência máxima)"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={entry.isVacation || false}
                          onChange={(e) => updateEntry(index, 'isVacation', e.target.checked)}
                          disabled={entry.isHoliday}
                          className="h-4 w-4"
                          aria-label="Marcar como férias"
                          title={entry.isHoliday ? "Não é possível marcar férias em feriado" : "Marcar como férias"}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={entry.isSick}
                          onChange={(e) => updateEntry(index, 'isSick', e.target.checked)}
                          disabled={entry.isHoliday || entry.isVacation}
                          className="h-4 w-4"
                          aria-label="Marcar como doente"
                          title={entry.isHoliday || entry.isVacation ? "Não é possível marcar doente em feriado ou férias" : "Marcar como doente"}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.description}
            onChange={(e) => updateEntry(index, 'description', e.target.value)}
                          placeholder="Descrição..."
                          className="w-[150px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => clearDayEntry(index)}
                          title="Limpar dados da entrada"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-medium">{weekTotal.toFixed(2)}h</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Padrão: <span className="font-medium">{standardWeeklyHours}h</span>
                </div>
                {overtimeHours > 0 && (
                  <div className="text-sm text-amber-600">
                    Horas Extras: <span className="font-medium">{overtimeHours.toFixed(2)}h</span>
                  </div>
                )}
              </div>
              {existingEntries.length > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Esta semana já possui {existingEntries.length} entrada(s) salva(s). 
                    Salvar novamente irá substituir as entradas existentes.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving || !selectedContractId}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? 'Salvando...' : 'Salvar Timesheet'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}