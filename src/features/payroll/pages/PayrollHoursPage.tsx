import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { LoadingSpinner } from '../../../components/ui/loading-states';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { payrollService } from '../services/payrollService';
import { 
  Clock, 
  Copy, 
  Calendar, 
  Plus, 
  Save, 
  Coffee,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { PayrollContract } from '../types';

interface TimeEntry {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  notes: string;
  isHoliday: boolean;
  isSick: boolean;
  isVacation: boolean;
}

interface WeekData {
  weekStart: Date;
  entries: TimeEntry[];
  totalHours: number;
  overtimeHours: number;
}

const PayrollHoursPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Estado para dados do contrato
  const [contract, setContract] = useState<PayrollContract | null>(null);
  
  // Inicializar entradas vazias para a semana
  const initializeWeekEntries = (week: Date): TimeEntry[] => {
    const weekDaysForInit = Array.from({ length: 7 }, (_, i) => addDays(week, i));
    return weekDaysForInit.map(day => ({
      date: format(day, 'yyyy-MM-dd'),
      startTime: '',
      endTime: '',
      breakMinutes: 60,
      notes: '',
      isHoliday: false,
      isSick: false,
      isVacation: false
    }));
  };
  
  // Carregar dados da semana
  const loadWeekData = async (week: Date) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const data = await payrollService.getTimeEntries(
        user.id,
        format(week, 'yyyy-MM-dd'),
        format(addDays(week, 7), 'yyyy-MM-dd')
      );
      
      const entries = initializeWeekEntries(week);
      
      // Preencher com dados existentes
      if (data) {
        data.forEach(entry => {
          const dayIndex = new Date(entry.date).getDay();
          const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Ajustar para segunda = 0
          
          if (adjustedIndex >= 0 && adjustedIndex < 7) {
            entries[adjustedIndex] = {
              ...entries[adjustedIndex],
              startTime: entry.start_time || '',
              endTime: entry.end_time || '',
              breakMinutes: entry.break_minutes || 0,
              notes: entry.notes || '',
              isHoliday: entry.is_holiday || false,
              isSick: entry.is_sick || false,
              isVacation: entry.is_vacation || false
            };
          }
        });
      }
      
      const newWeekData = {
        weekStart: week,
        entries,
        totalHours: 0,
        overtimeHours: 0
      };
      
      setWeekData(newWeekData);
      calculateWeekTotals(entries);
    } catch (error) {
      console.error('Erro ao carregar dados da semana:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da semana.",
        variant: "destructive"
      });
      
      // Fallback para dados vazios
      setWeekData({
        weekStart: week,
        entries: initializeWeekEntries(week),
        totalHours: 0,
        overtimeHours: 0
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calcular totais da semana
  const calculateWeekTotals = (entries: TimeEntry[]) => {
    const totalHours = entries.reduce((sum, entry) => {
      if (entry.isVacation || entry.isHoliday || entry.isSick) return sum;
      return sum + calculateHours(entry.startTime, entry.endTime, entry.breakMinutes);
    }, 0);
    
    const overtimeHours = Math.max(0, totalHours - 40);
    
    setWeekData(prev => ({
      ...prev,
      totalHours,
      overtimeHours
    }));
  };
  
  // Carregar dados do contrato
  const loadContract = async () => {
    if (!user) return;
    
    try {
      const contract = await payrollService.getActiveContract(user.id);
      setContract(contract);
    } catch (error) {
      console.error('Erro ao carregar contrato:', error);
    }
  };
  
  // Carregar dados iniciais
  useEffect(() => {
    if (user) {
      loadContract();
      loadWeekData(currentWeek);
    }
  }, [user]);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [weekData, setWeekData] = useState<WeekData>({
    weekStart: currentWeek,
    entries: [],
    totalHours: 0,
    overtimeHours: 0
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: pt });



  const calculateHours = (startTime: string, endTime: string, breakMinutes: number): number => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    if (end <= start) return 0;
    
    const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60) - breakMinutes;
    return Math.max(0, totalMinutes / 60);
  };

  const updateEntry = (dayIndex: number, field: keyof TimeEntry, value: any) => {
    setWeekData(prev => {
      const newEntries = [...prev.entries];
      newEntries[dayIndex] = { ...newEntries[dayIndex], [field]: value };
      
      calculateWeekTotals(newEntries);
      
      return {
        ...prev,
        entries: newEntries
      };
    });
  };

  const fillStandardWeek = () => {
    setWeekData(prev => {
      const newEntries = prev.entries.map((entry, index) => {
        // Segunda a Sexta (índices 0-4)
        if (index < 5) {
          // Usar definições do contrato se disponíveis, senão usar padrão
          let startTime = '09:00';
          let endTime = '18:00';
          let breakMinutes = 60;
          
          if (contract?.schedule_json) {
            // Verificar se usa o novo formato (horário padrão)
            if (contract.schedule_json.use_standard) {
              startTime = contract.schedule_json.start_time || '09:00';
              endTime = contract.schedule_json.end_time || '18:00';
              breakMinutes = contract.schedule_json.break_minutes || 60;
            } else {
              // Formato antigo (por dia da semana)
              const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
              const daySchedule = contract.schedule_json[dayNames[index]];
              
              if (daySchedule && daySchedule.start && daySchedule.end) {
                startTime = daySchedule.start;
                endTime = daySchedule.end;
                breakMinutes = daySchedule.break_minutes || 60;
              }
            }
          }
          
          return {
            ...entry,
            startTime,
            endTime,
            breakMinutes,
            isHoliday: false,
            isSick: false,
            isVacation: false
          };
        }
        return entry; // Fim de semana fica vazio
      });
      
      // Calcular total de horas baseado no horário real
      const totalHours = newEntries.slice(0, 5).reduce((sum, entry) => {
        return sum + calculateHours(entry.startTime, entry.endTime, entry.breakMinutes);
      }, 0);
      
      return {
        ...prev,
        entries: newEntries,
        totalHours,
        overtimeHours: Math.max(0, totalHours - 40)
      };
    });
    
    // Gerar descrição baseada no formato do contrato
    let scheduleDescription = 'Horário padrão aplicado (09:00-18:00, 60min pausa)';
    
    if (contract?.schedule_json) {
      if (contract.schedule_json.use_standard) {
        const start = contract.schedule_json.start_time || '09:00';
        const end = contract.schedule_json.end_time || '18:00';
        scheduleDescription = `Horário do contrato aplicado (${start}-${end})`;
      } else if (contract.schedule_json.monday) {
        const start = contract.schedule_json.monday.start || '09:00';
        const end = contract.schedule_json.monday.end || '18:00';
        scheduleDescription = `Horário do contrato aplicado (${start}-${end})`;
      }
    }
    
    toast({
      title: "Semana preenchida",
      description: scheduleDescription,
    });
  };

  const duplicatePreviousWeek = async () => {
    if (!user) return;
    
    try {
      const previousWeek = subWeeks(currentWeek, 1);
      const { data, error } = await supabase
        .from('payroll_time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(previousWeek, 'yyyy-MM-dd'))
        .lt('date', format(addDays(previousWeek, 7), 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const newEntries = weekData.entries.map((entry, index) => {
          const previousEntry = data.find(d => 
            new Date(d.date).getDay() === (index + 1) % 7
          );
          
          if (previousEntry) {
            return {
              ...entry,
              startTime: previousEntry.start_time || '',
              endTime: previousEntry.end_time || '',
              breakMinutes: previousEntry.break_minutes || 0,
              notes: previousEntry.notes || ''
            };
          }
          return entry;
        });
        
        setWeekData(prev => ({ ...prev, entries: newEntries }));
        calculateWeekTotals(newEntries);
        
        toast({
          title: "Semana duplicada",
          description: "Os dados da semana anterior foram copiados com sucesso."
        });
      } else {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não foram encontrados registos na semana anterior.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao duplicar semana anterior:', error);
      toast({
        title: "Erro",
        description: "Não foi possível duplicar a semana anterior.",
        variant: "destructive"
      });
    }
  };

  const addQuickHours = (dayIndex: number, hours: number, startHour?: string, endHour?: string, breakMins?: number) => {
    // Usar dados do contrato se disponíveis
    let startTime = startHour || '09:00';
    let endTime = endHour || '18:00';
    let breakMinutes = breakMins !== undefined ? breakMins : (hours === 8 ? 60 : 0);
    
    if (contract?.schedule_json && hours === 8) {
      const scheduleJson = contract.schedule_json;
      
      if (scheduleJson.use_standard_schedule) {
        // Usar horário padrão para todos os dias
        startTime = scheduleJson.standard_start_time || '09:00';
        endTime = scheduleJson.standard_end_time || '18:00';
        breakMinutes = scheduleJson.standard_break_minutes || 60;
      } else {
        // Usar horário específico do dia (estrutura antiga)
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const daySchedule = scheduleJson[dayNames[dayIndex]];
        
        if (daySchedule && daySchedule.start && daySchedule.end) {
          startTime = daySchedule.start;
          endTime = daySchedule.end;
          breakMinutes = daySchedule.break_minutes || 60;
        }
      }
    } else if (hours === 4) {
      endTime = endHour || '18:00';
      startTime = startHour || '14:00';
      breakMinutes = 0;
    }
    
    updateEntry(dayIndex, 'startTime', startTime);
    updateEntry(dayIndex, 'endTime', endTime);
    updateEntry(dayIndex, 'breakMinutes', breakMinutes);
  };

  const addBreak = (dayIndex: number, minutes: number) => {
    const currentBreak = weekData.entries[dayIndex].breakMinutes;
    updateEntry(dayIndex, 'breakMinutes', currentBreak + minutes);
  };

  const markAsVacation = (dayIndex: number) => {
    updateEntry(dayIndex, 'isVacation', !weekData.entries[dayIndex].isVacation);
    if (!weekData.entries[dayIndex].isVacation) {
      updateEntry(dayIndex, 'startTime', '');
      updateEntry(dayIndex, 'endTime', '');
      updateEntry(dayIndex, 'breakMinutes', 0);
    }
  };

  const saveWeek = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      const entriesToSave = weekData.entries
        .filter(entry => entry.startTime || entry.endTime || entry.isVacation || entry.isSick)
        .map(entry => ({
          user_id: user.id,
          contract_id: contract?.id ?? null,
          date: entry.date,
          start_time: entry.startTime || null,
          end_time: entry.endTime || null,
          break_minutes: entry.breakMinutes || 0,
          notes: entry.notes || null
        }));
      
      // TEMP LOG: diagnóstico do payload de semana
      console.debug('[payroll-save][week] upsert payload', {
        count: entriesToSave.length,
        sample: entriesToSave[0],
        onConflict: 'user_id,date,contract_id',
        userId: user.id,
        contractId: contract?.id ?? null,
        weekStart: format(currentWeek, 'yyyy-MM-dd')
      });
      
      if (entriesToSave.length > 0) {
        const { error } = await supabase
          .from('payroll_time_entries')
          .upsert(entriesToSave, {
            onConflict: 'user_id,date,contract_id'
          });
        
        if (error) {
          console.error('[payroll-save][week] upsert error', error);
          throw error;
        }
        
        console.debug('[payroll-save][week] upsert success', { saved: entriesToSave.length });
        
        toast({
          title: "Semana guardada",
          description: `${entriesToSave.length} registos de horas foram guardados com sucesso.`
        });
      } else {
        toast({
          title: "Nenhum registo para guardar",
          description: "Adicione pelo menos uma entrada de tempo antes de guardar.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('[payroll-save][week] unexpected error', { message: error?.message, error });
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível guardar os registos de horas.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveDay = async (dayIndex: number) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const entry = weekData.entries[dayIndex];
      
      if (!entry.startTime && !entry.endTime && !entry.isVacation && !entry.isSick) {
        toast({
          title: "Nenhum registo para guardar",
          description: "Este dia não tem dados para guardar.",
          variant: "destructive"
        });
        return;
      }
      
      const entryToSave = {
        user_id: user.id,
        contract_id: contract?.id ?? null,
        date: entry.date,
        start_time: entry.startTime || null,
        end_time: entry.endTime || null,
        break_minutes: entry.breakMinutes || 0,
        notes: entry.notes || null
      };
      
      // TEMP LOG: diagnóstico do payload do dia
      console.debug('[payroll-save][day] upsert payload', {
        entryToSave,
        onConflict: 'user_id,date,contract_id',
        userId: user.id,
        contractId: contract?.id ?? null,
        dayIndex,
        date: entry.date
      });
      
      const { error } = await supabase
        .from('payroll_time_entries')
        .upsert([entryToSave], {
          onConflict: 'user_id,date,contract_id'
        });
      
      if (error) {
        console.error('[payroll-save][day] upsert error', error);
        throw error;
      }
      
      console.debug('[payroll-save][day] upsert success', { date: entry.date });
      
      toast({
        title: "Dia guardado",
        description: `Registo do dia ${format(new Date(entry.date), 'dd/MM', { locale: pt })} foi guardado com sucesso.`
      });
      
    } catch (error: any) {
      console.error('[payroll-save][day] unexpected error', { message: error?.message, error });
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível guardar o registo do dia.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' 
      ? subWeeks(currentWeek, 1) 
      : addWeeks(currentWeek, 1);
    
    setCurrentWeek(newWeek);
    loadWeekData(newWeek);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registo de Horas</h1>
          <p className="text-muted-foreground">{currentMonth}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fillStandardWeek} variant="outline" className="gap-2">
            <Clock className="h-4 w-4" />
            Preencher Semana Padrão
          </Button>
          <Button onClick={duplicatePreviousWeek} variant="outline" className="gap-2">
            <Copy className="h-4 w-4" />
            Duplicar Semana Anterior
          </Button>
        </div>
      </div>

      {/* Navegação da Semana */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle>
              Semana de {format(currentWeek, 'd', { locale: pt })} a {format(addDays(currentWeek, 6), 'd MMMM yyyy', { locale: pt })}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {weekDays.map((day, dayIndex) => {
              const entry = weekData.entries[dayIndex];
              const dayName = format(day, 'EEEE', { locale: pt });
              const dayDate = format(day, 'd MMM', { locale: pt });
              const isToday = isSameDay(day, new Date());
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const hours = calculateHours(entry?.startTime || '', entry?.endTime || '', entry?.breakMinutes || 0);
              
              return (
                <Card key={dayIndex} className={`${isToday ? 'ring-2 ring-blue-500' : ''} ${isWeekend ? 'bg-gray-50' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold capitalize">{dayName}</h3>
                        <p className="text-sm text-muted-foreground">{dayDate}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry?.isVacation && <Badge variant="secondary">Férias</Badge>}
                        {entry?.isHoliday && <Badge variant="outline">Feriado</Badge>}
                        {entry?.isSick && <Badge variant="destructive">Doença</Badge>}
                        {hours > 0 && <Badge variant="default">{hours.toFixed(1)}h</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Botões Rápidos */}
                    <div className="flex gap-2 flex-wrap">
                      {(() => {
                        // Obter horários do contrato
                        const scheduleJson = contract?.schedule_json;
                        let contractStart, contractEnd, contractBreak;
                        
                        if (scheduleJson?.use_standard) {
                          // Usar horário padrão para todos os dias (novo formato)
                          contractStart = scheduleJson.start_time || '09:00';
                          contractEnd = scheduleJson.end_time || '18:00';
                          contractBreak = scheduleJson.break_minutes || 60;
                        } else {
                          // Usar horário específico do dia (formato antigo)
                          const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                          const daySchedule = scheduleJson?.[dayNames[dayIndex]];
                          contractStart = daySchedule?.start || '09:00';
                          contractEnd = daySchedule?.end || '18:00';
                          contractBreak = daySchedule?.break_minutes || 60;
                        }
                        
                        // Calcular horas de trabalho do contrato
                        const startTime = new Date(`2000-01-01T${contractStart}:00`);
                        const endTime = new Date(`2000-01-01T${contractEnd}:00`);
                        const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60) - contractBreak;
                        const contractHours = Math.round(totalMinutes / 60 * 10) / 10;
                        
                        return (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => addQuickHours(dayIndex, 8)}
                              disabled={entry?.isVacation || entry?.isHoliday}
                            >
                              + {contractHours}h ({contractStart.substring(0,5)}-{contractEnd.substring(0,5)})
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => addQuickHours(dayIndex, 4, '14:00')}
                              disabled={entry?.isVacation || entry?.isHoliday}
                            >
                              + 4h (14-18)
                            </Button>
                          </>
                        );
                      })()}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => addBreak(dayIndex, 30)}
                        disabled={entry?.isVacation || entry?.isHoliday}
                        className="gap-1"
                      >
                        <Coffee className="h-3 w-3" />
                        Pausa +30m
                      </Button>
                      <Button 
                        size="sm" 
                        variant={entry?.isVacation ? "default" : "outline"}
                        onClick={() => markAsVacation(dayIndex)}
                        className="gap-1"
                      >
                        <Calendar className="h-3 w-3" />
                        {entry?.isVacation ? 'Remover Férias' : 'Marcar Férias'}
                      </Button>
                    </div>
                    
                    {/* Campos de Entrada */}
                    {!entry?.isVacation && !entry?.isHoliday && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`start-${dayIndex}`} className="text-xs">Início</Label>
                          <Input
                            id={`start-${dayIndex}`}
                            type="time"
                            value={entry?.startTime || ''}
                            onChange={(e) => updateEntry(dayIndex, 'startTime', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`end-${dayIndex}`} className="text-xs">Fim</Label>
                          <Input
                            id={`end-${dayIndex}`}
                            type="time"
                            value={entry?.endTime || ''}
                            onChange={(e) => updateEntry(dayIndex, 'endTime', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`break-${dayIndex}`} className="text-xs">Pausa (min)</Label>
                          <Input
                            id={`break-${dayIndex}`}
                            type="number"
                            min="0"
                            step="15"
                            value={entry?.breakMinutes || 0}
                            onChange={(e) => updateEntry(dayIndex, 'breakMinutes', parseInt(e.target.value) || 0)}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`notes-${dayIndex}`} className="text-xs">Notas</Label>
                          <Input
                            id={`notes-${dayIndex}`}
                            placeholder="Opcional"
                            value={entry?.notes || ''}
                            onChange={(e) => updateEntry(dayIndex, 'notes', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Botão para guardar este dia */}
                    <div className="flex justify-end pt-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => saveDay(dayIndex)}
                        disabled={isSaving || (!entry?.startTime && !entry?.endTime && !entry?.isVacation && !entry?.isSick)}
                        className="gap-1"
                      >
                        <Save className="h-3 w-3" />
                        Guardar Dia
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resumo da Semana */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{weekData.totalHours.toFixed(1)}h</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{weekData.overtimeHours.toFixed(1)}h</p>
              <p className="text-sm text-muted-foreground">Horas Extra</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">40h</p>
              <p className="text-sm text-muted-foreground">Padrão</p>
            </div>
            <div className="text-center">
              <Button onClick={saveWeek} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? 'Guardando...' : 'Guardar Semana'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollHoursPage;