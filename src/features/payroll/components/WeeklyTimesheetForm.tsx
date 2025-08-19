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
import { Loader2, Clock, Save, Upload, Download, Calendar, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { PayrollTimeEntry, PayrollContract, TimesheetEntry, WeeklyTimesheet } from '../types';
import { payrollService } from '../services/payrollService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { calculateHours, formatCurrency } from '../lib/calc';

interface WeeklyTimesheetFormProps {
  weekStart: Date;
  contractId?: string;
  onSave?: (entries: PayrollTimeEntry[]) => void;
}

export function WeeklyTimesheetForm({ weekStart, contractId, onSave }: WeeklyTimesheetFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contracts, setContracts] = useState<PayrollContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState(contractId || '');
  const [timesheet, setTimesheet] = useState<WeeklyTimesheet>({ entries: [] });
  const [existingEntries, setExistingEntries] = useState<PayrollTimeEntry[]>([]);

  // Gerar os 7 dias da semana
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
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
  }, [selectedContractId, weekStart]);

  const loadContracts = async () => {
    if (!user?.id) return;
    
    try {
      const data = await payrollService.getContracts(user.id);
      setContracts(data.filter(c => c.is_active));
      
      if (!selectedContractId && data.length > 0) {
        setSelectedContractId(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar contratos.',
        variant: 'destructive'
      });
      console.error('Error loading contracts:', error);
    }
  };

  const loadExistingEntries = async () => {
    if (!selectedContractId || !user?.id) return;

    setLoading(true);
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const entries = await payrollService.getTimeEntries(
        user.id,
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
      );
      
      setExistingEntries(entries);
      
      // Converter entradas existentes para formato de timesheet
      const timesheetEntries: TimesheetEntry[] = weekDays.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayEntries = entries.filter(e => 
          e.entry_date.toISOString().split('T')[0] === dateStr
        );
        
        if (dayEntries.length > 0) {
          const entry = dayEntries[0];
          return {
          date: dateStr,
          startTime: entry.start_time || '',
          endTime: entry.end_time || '',
          breakMinutes: entry.break_minutes || 0,
          notes: entry.notes || '',
          isHoliday: entry.is_holiday || false,
          isSick: entry.is_sick || false,
          isException: false
        };
        }
        
        return {
        date: dateStr,
        startTime: '',
        endTime: '',
        breakMinutes: 0,
        notes: '',
        isHoliday: false,
        isSick: false,
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
    newEntries[index] = { ...newEntries[index], [field]: value };
    setTimesheet({ entries: newEntries });
  };

  const addEmptyEntry = () => {
    const newEntry: TimesheetEntry = {
      date: weekDays[0].toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      breakMinutes: 0,
      notes: '',
      isHoliday: false,
      isSick: false,
      isException: false
    };
    setTimesheet({ entries: [...timesheet.entries, newEntry] });
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
    const newEntries: TimesheetEntry[] = weekDays.map((date, index) => {
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Convert to our schedule format (Monday = 0, Sunday = 6)
      const scheduleIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const daySchedule = schedule[scheduleIndex];
      
      if (daySchedule?.enabled) {
        return {
           date: dateStr,
           startTime: daySchedule.start_time || '',
           endTime: daySchedule.end_time || '',
           breakMinutes: daySchedule.break_minutes || 0,
           notes: '',
           isHoliday: false,
           isSick: false,
           isException: false
         };
      } else {
         return {
           date: dateStr,
           startTime: '',
           endTime: '',
           breakMinutes: 0,
           notes: '',
           isHoliday: false,
           isSick: false,
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

  const removeEntry = (index: number) => {
    const newEntries = timesheet.entries.filter((_, i) => i !== index);
    setTimesheet({ entries: newEntries });
  };

  const calculateDayHours = (entry: TimesheetEntry): number => {
    if (!entry.startTime || !entry.endTime || entry.isHoliday || entry.isSick) {
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
            entry_date: new Date(entry.date),
            start_time: entry.startTime || null,
            end_time: entry.endTime || null,
            break_minutes: entry.breakMinutes || 0,
            notes: entry.notes || null,
            is_holiday: entry.isHoliday || false,
            is_sick: entry.isSick || false
          }));

      // Deletar entradas existentes da semana
      for (const existingEntry of existingEntries) {
        await payrollService.deleteTimeEntry(existingEntry.id);
      }

      // Criar novas entradas
      const savedEntries: PayrollTimeEntry[] = [];
      for (const entry of timeEntries) {
        const saved = await payrollService.createTimeEntry(user.id, entry);
        savedEntries.push(saved);
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
            notes: notes || '',
            isHoliday: isHoliday === 'true' || isHoliday === '1',
            isSick: isSick === 'true' || isSick === '1',
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
    const headers = ['data', 'inicio', 'fim', 'pausa_minutos', 'notas', 'feriado', 'doente', 'excecao'];
    const rows = timesheet.entries.map(entry => [
      entry.date,
      entry.startTime,
      entry.endTime,
      entry.breakMinutes.toString(),
      entry.notes,
      entry.isHoliday ? '1' : '0',
      entry.isSick ? '1' : '0',
      entry.isException ? '1' : '0'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheet_${weekStart.toISOString().split('T')[0]}.csv`);
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
                Semana de {weekStart.toLocaleDateString('pt-PT')} a {weekDays[6].toLocaleDateString('pt-PT')}
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
              <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contrato" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map(contract => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.employee_name}
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
            <CardTitle>Entradas de Tempo</CardTitle>
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
              <Button onClick={addEmptyEntry} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Entrada
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
                  <TableHead>Doente</TableHead>
                  <TableHead>Notas</TableHead>
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
                          disabled={entry.isHoliday || entry.isSick}
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={entry.endTime}
                          onChange={(e) => updateEntry(index, 'endTime', e.target.value)}
                          disabled={entry.isHoliday || entry.isSick}
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={entry.breakMinutes}
                          onChange={(e) => updateEntry(index, 'breakMinutes', parseInt(e.target.value) || 0)}
                          disabled={entry.isHoliday || entry.isSick}
                          className="w-[80px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={dayHours > 8 ? 'destructive' : 'default'}>
                          {dayHours.toFixed(2)}h
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={entry.isException || false}
                          onChange={(e) => updateEntry(index, 'isException', e.target.checked)}
                          className="h-4 w-4"
                          title="Marcar como exceção ao horário normal"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={entry.isHoliday}
                          onChange={(e) => updateEntry(index, 'isHoliday', e.target.checked)}
                          className="h-4 w-4"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={entry.isSick}
                          onChange={(e) => updateEntry(index, 'isSick', e.target.checked)}
                          className="h-4 w-4"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.notes}
                          onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                          placeholder="Notas..."
                          className="w-[150px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeEntry(index)}
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