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
import { PayrollTimeEntry, PayrollContract, TimesheetEntry, WeeklyTimesheet, PayrollOTPolicy } from '../types';
import { payrollService } from '../services/payrollService';
import { performanceBonusService } from '../services/performanceBonusService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveContract } from '../hooks/useActiveContract';
import { formatCurrency } from '@/lib/utils';
import { calculateHours, segmentEntry, calcHourly } from '../lib/calc';

interface WeeklyTimesheetFormProps {
  initialWeekStart?: Date;
  contractId?: string;
  onSave?: (entries: PayrollTimeEntry[]) => void;
}

export function WeeklyTimesheetForm({ initialWeekStart, contractId, onSave }: WeeklyTimesheetFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeContract, contracts, setActiveContract } = useActiveContract();
  const [loading, setLoading] = useState(false);
  const [weekNavigationLoading, setWeekNavigationLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedContractId = contractId || activeContract?.id || '';
  
  // Função para calcular o início da semana (segunda-feira)
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    // Se for domingo (0), voltar 6 dias para chegar à segunda-feira
    // Se for segunda-feira (1), não mover
    // Se for terça-feira (2), voltar 1 dia para chegar à segunda-feira
    // etc.
    const diff = day === 0 ? -6 : 1 - day;
    const result = new Date(d);
    result.setDate(d.getDate() + diff);
    return result;
  };
  
  const [selectedWeek, setSelectedWeek] = useState(
    getWeekStart(initialWeekStart || new Date()).toISOString().split('T')[0]
  );
  const [timesheet, setTimesheet] = useState<WeeklyTimesheet>({ entries: [] });
  const [existingEntries, setExistingEntries] = useState<PayrollTimeEntry[]>([]);
  const [otPolicy, setOtPolicy] = useState<PayrollOTPolicy | null>(null);

  // Função para calcular o número da semana
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Gerar os 7 dias da semana (começando na segunda-feira)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const weekStart = new Date(selectedWeek + 'T00:00:00'); // Garantir timezone local
    // Usar a mesma lógica da função getWeekStart para consistência
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mondayDate = new Date(weekStart);
    mondayDate.setDate(weekStart.getDate() + diff);
    // Agora adicionar os dias da semana
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + i);
    return date;
  });

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // Função para criar entradas vazias para a semana
  const createEmptyWeekEntries = async (): Promise<TimesheetEntry[]> => {
    if (!selectedContractId || !user?.id) {
      return weekDays.map(day => {
        const dateStr = day.toISOString().split('T')[0];
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
    }

    try {
      // Carregar feriados para o ano da semana selecionada
      const weekYear = new Date(selectedWeek).getFullYear();
      const holidays = await payrollService.getHolidays(
        user.id,
        weekYear,
        selectedContractId
      );

      return weekDays.map(day => {
        const dateStr = day.toISOString().split('T')[0];
        const isHolidayDate = holidays.some(holiday => holiday.date === dateStr);
        
        return {
          date: dateStr,
          startTime: '',
          endTime: '',
          breakMinutes: 0,
          description: '',
          isHoliday: isHolidayDate,
          isSick: false,
          isVacation: false,
          isException: false
        };
      });
    } catch (error) {
      console.error('Error loading holidays for empty entries:', error);
      return weekDays.map(day => {
        const dateStr = day.toISOString().split('T')[0];
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
    }
  };

  // Remove the loadContracts useEffect since useActiveContract handles this

  // Effect para carregar política OT quando contrato muda
  useEffect(() => {
    const loadOTPolicy = async () => {
      if (selectedContractId && user?.id) {
        try {
          const policy = await payrollService.getActiveOTPolicy(user.id, selectedContractId);
          setOtPolicy(policy);
        } catch (error) {
          console.error('Failed to load OT policy:', error);
          setOtPolicy(null);
        }
      }
    };
    
    loadOTPolicy();
  }, [selectedContractId]);

  // Effect para carregar entradas quando semana ou contrato muda
  useEffect(() => {
    const initializeEntries = async () => {
      if (selectedContractId) {
        // Detectar se é mudança de semana (não de contrato)
        const isWeekNavigation = selectedContractId === activeContract?.id;
        await loadExistingEntries(isWeekNavigation);
      } else {
        const emptyEntries = await createEmptyWeekEntries();
        setTimesheet({ entries: emptyEntries });
      }
    };
    
    initializeEntries();
  }, [selectedContractId, selectedWeek]);

  // loadContracts function removed since useActiveContract handles this

  const loadExistingEntries = async (isWeekNavigation = false) => {
     if (!selectedContractId || !user?.id) {
       return;
     }

    if (isWeekNavigation) {
      setWeekNavigationLoading(true);
    } else {
      setLoading(true);
    }
    try {
      const weekEnd = new Date(selectedWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const entries = await payrollService.getTimeEntries(
        user.id,
        selectedWeek,
        weekEnd.toISOString().split('T')[0]
      );
      

      
      // Carregar períodos de férias para a semana
      const leaves = await payrollService.getLeavesForWeek(
        user.id,
        selectedWeek,
        weekEnd.toISOString().split('T')[0],
        selectedContractId
      );
      
      // Carregar feriados para o ano da semana selecionada
      const weekYear = new Date(selectedWeek).getFullYear();
      const holidays = await payrollService.getHolidays(
        user.id,
        weekYear,
        selectedContractId
      );
      
      setExistingEntries(entries);
      
      // Converter entradas existentes para formato de timesheet
      const timesheetEntries: TimesheetEntry[] = weekDays.map((date, dayIndex) => {
        const dateStr = date.toISOString().split('T')[0];
        const dayEntries = entries.filter(e => {
          // Normalizar a data da entrada para comparação
          let entryDate: string;
          if (typeof e.date === 'string') {
            entryDate = e.date.includes('T') ? e.date.split('T')[0] : e.date;
          } else {
            entryDate = new Date(e.date).toISOString().split('T')[0];
          }
          const matches = entryDate === dateStr;
          

          
          return matches;
        });
        
        // Verificar se este dia está dentro de um período de férias
        const isOnLeave = leaves.some(leave => {
          const leaveStart = new Date(leave.start_date);
          const leaveEnd = new Date(leave.end_date);
          const currentDate = new Date(dateStr);
          return currentDate >= leaveStart && currentDate <= leaveEnd;
        });
        
        // Verificar se este dia é feriado
        const isHolidayDate = holidays.some(holiday => holiday.date === dateStr);
        
        const result = dayEntries.length > 0 ? {
          date: dateStr,
          startTime: dayEntries[0].start_time || '',
          endTime: dayEntries[0].end_time || '',
          breakMinutes: dayEntries[0].break_minutes || 0,
          description: dayEntries[0].description || '',
          isHoliday: dayEntries[0].is_holiday || isHolidayDate,
          isSick: dayEntries[0].is_sick || false,
          isVacation: dayEntries[0].is_vacation || isOnLeave,
          isException: false
        } : {
          date: dateStr,
          startTime: '',
          endTime: '',
          breakMinutes: 0,
          description: '',
          isHoliday: isHolidayDate,
          isSick: false,
          isVacation: isOnLeave,
          isException: false
        };
        

        
        return result;
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
      setWeekNavigationLoading(false);
    }
  };

  const updateEntry = (index: number, field: keyof TimesheetEntry, value: any) => {
    console.log('🔄 DEBUG - updateEntry called:', { index, field, value, currentValue: timesheet.entries[index]?.[field] });
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
    console.log('🔄 DEBUG - Setting new timesheet entries, entry updated:', { index, field, newValue: entry[field] });
    setTimesheet({ entries: newEntries });
    console.log('🔄 DEBUG - Timesheet state updated via updateEntry');
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
    
    // DEBUG: Log detalhado da semana selecionada e dias gerados
    console.log('=== DEBUG FILL NORMAL WEEK ===');
    console.log('selectedWeek:', selectedWeek);
    console.log('weekDays array:', weekDays.map((d, i) => ({
      index: i,
      date: d.toISOString().split('T')[0],
      dayOfWeek: d.getDay(),
      dayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][d.getDay()]
    })));
    
    // Verificar se é o formato novo (com use_standard) ou antigo (dias individuais)
    const isNewFormat = schedule.use_standard !== undefined;
    
    if (isNewFormat && !schedule.use_standard) {
      toast({
        title: 'Erro',
        description: 'Horário padrão não está ativado no contrato.',
        variant: 'destructive'
      });
      return;
    }
    
    if (isNewFormat && (!schedule.start_time || !schedule.end_time)) {
      toast({
        title: 'Erro',
        description: 'Horário padrão não está configurado corretamente.',
        variant: 'destructive'
      });
      return;
    }
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    const newEntries: TimesheetEntry[] = timesheet.entries.map((currentEntry, index) => {
      const date = weekDays[index];
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayName = dayNames[dayOfWeek];
      
      // Apenas preencher dias úteis (segunda a sexta-feira)
      // Como weekDays começa na segunda-feira, índices 0-4 são segunda a sexta
      const isWeekday = index >= 0 && index <= 4;
      
      const hasValidTime = currentEntry.startTime && 
                          currentEntry.endTime && 
                          currentEntry.startTime !== '00:00' && 
                          currentEntry.endTime !== '00:00' &&
                          currentEntry.startTime.trim() !== '' &&
                          currentEntry.endTime.trim() !== '';
      
      console.log(`Processando dia ${index}:`, {
        date: date.toISOString().split('T')[0],
        dayOfWeek,
        dayName,
        index,
        isWeekday,
        startTime: currentEntry.startTime,
        endTime: currentEntry.endTime,
        hasValidTime,
        isHoliday: currentEntry.isHoliday,
        isVacation: currentEntry.isVacation,
        isSick: currentEntry.isSick,
        isException: currentEntry.isException
      });
      
      if (hasValidTime) {
         console.log(`Dia ${index}: Mantendo entrada existente com horários válidos`);
         return currentEntry;
       }
      
      // Não preencher se for feriado, férias ou doente (a menos que seja exceção)
      if ((currentEntry.isHoliday || currentEntry.isVacation || currentEntry.isSick) && !currentEntry.isException) {
        console.log(`Dia ${index}: Não preenchendo - feriado/férias/doente`);
        return currentEntry;
      }
      
      let shouldFillDay = false;
      let startTime = '';
      let endTime = '';
      let breakMinutes = 0;
      
      if (isNewFormat) {
        // Formato novo: usar horário padrão para dias úteis (segunda a sexta)
        if (isWeekday && schedule.use_standard) {
          shouldFillDay = true;
          startTime = schedule.start_time;
          endTime = schedule.end_time;
          breakMinutes = schedule.break_minutes || 0;
          console.log(`Dia ${index}: Preenchendo com horário padrão`, { startTime, endTime, breakMinutes });
        } else {
          console.log(`Dia ${index}: Não é dia útil ou horário padrão não ativo`);
        }
      } else {
        // Formato antigo: verificar se o dia tem horário definido E se é dia útil
        const daySchedule = schedule[dayName];
        if (isWeekday && daySchedule && daySchedule.start && daySchedule.end) {
          shouldFillDay = true;
          startTime = daySchedule.start;
          endTime = daySchedule.end;
          breakMinutes = daySchedule.break_minutes || 0;
        }
      }
      
      if (shouldFillDay) {
        return {
           ...currentEntry,
           startTime,
           endTime,
           breakMinutes
         };
      } else {
         return currentEntry;
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
    const existingEntry = existingEntries.find(e => {
      const entryDate = typeof e.date === 'string' ? e.date : new Date(e.date).toISOString().split('T')[0];
      return entryDate === dateStr;
    });
    
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

  const calculateDayHoursWithOT = (entry: TimesheetEntry): { regularHours: number; overtimeHours: number; totalHours: number } => {
    if (!entry.startTime || !entry.endTime || (entry.isHoliday && !entry.isException) || (entry.isSick && !entry.isException) || (entry.isVacation && !entry.isException)) {
      return { regularHours: 0, overtimeHours: 0, totalHours: 0 };
    }

    // Se não há política de overtime, usar cálculo simples
    if (!otPolicy) {
      const totalHours = calculateDayHours(entry);
      return { regularHours: totalHours, overtimeHours: 0, totalHours };
    }

    // Converter TimesheetEntry para PayrollTimeEntry para usar com segmentEntry
    const payrollEntry = {
      date: entry.date,
      start_time: entry.startTime,
      end_time: entry.endTime,
      break_minutes: entry.breakMinutes || 0,
      is_holiday: entry.isHoliday || false,
      is_vacation: entry.isVacation || false,
      is_sick: entry.isSick || false
    } as any; // Usar any para evitar problemas de tipos

    try {
      const segments = segmentEntry(payrollEntry, otPolicy, 8); // 8 horas como limite diário padrão
      
      let regularHours = 0;
      let overtimeHours = 0;
      
      segments.forEach(segment => {
        if (segment.isOvertime) {
          overtimeHours += segment.hours;
        } else {
          regularHours += segment.hours;
        }
      });
      
      const totalHours = regularHours + overtimeHours;
      return { regularHours, overtimeHours, totalHours };
    } catch (error) {
      console.error('Erro ao calcular horas com overtime:', error);
      // Fallback para cálculo simples
      const totalHours = calculateDayHours(entry);
      return { regularHours: totalHours, overtimeHours: 0, totalHours };
    }
  };

  const calculateWeekTotal = (): number => {
    return timesheet.entries.reduce((total, entry) => {
      return total + calculateDayHoursWithOT(entry).totalHours;
    }, 0);
  };

  const calculateWeekOvertimeTotal = (): number => {
    return timesheet.entries.reduce((total, entry) => {
      return total + calculateDayHoursWithOT(entry).overtimeHours;
    }, 0);
  };

  const calculateWeekRegularTotal = (): number => {
    return timesheet.entries.reduce((total, entry) => {
      return total + calculateDayHoursWithOT(entry).regularHours;
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
      const savedEntries: PayrollTimeEntry[] = [];
      
      // Processar cada entrada individualmente
      for (const entry of timesheet.entries) {
        const dateStr = entry.date;
        
        // Encontrar entrada existente para este dia (comparação mais robusta)
        console.log('🔍 DEBUG - All existing entries:', existingEntries.map(e => ({
          id: e.id,
          date: e.date,
          contract_id: e.contract_id,
          dateType: typeof e.date
        })));
        
        const existingEntry = existingEntries.find(e => {
          // Normalizar ambas as datas para o formato YYYY-MM-DD
          let entryDate: string;
          if (typeof e.date === 'string') {
            // Se já é string, verificar se está no formato correto
            entryDate = e.date.includes('T') ? e.date.split('T')[0] : e.date;
          } else {
            // Se é Date object, converter para string
            entryDate = new Date(e.date).toISOString().split('T')[0];
          }
          
          // Normalizar a data de entrada também
          const normalizedDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
          
          const matches = entryDate === normalizedDateStr && e.contract_id === selectedContractId;
          console.log('🔍 DEBUG - Comparing entry:', {
            entryId: e.id,
            entryDate,
            normalizedDateStr,
            originalDateStr: dateStr,
            contractMatch: e.contract_id === selectedContractId,
            dateMatch: entryDate === normalizedDateStr,
            overallMatch: matches
          });
          return matches;
        });
        
        console.log('🔍 DEBUG - Processing entry:', {
          dateStr,
          existingEntry: existingEntry ? { id: existingEntry.id, date: existingEntry.date } : null,
          selectedContractId
        });
        
        // Verificar se a entrada tem dados válidos
        const hasValidData = entry.startTime || entry.endTime || entry.isHoliday || entry.isSick || entry.isVacation;
        
        if (hasValidData) {
          // Preparar dados da entrada
          const entryData: Omit<PayrollTimeEntry, 'id' | 'created_at' | 'updated_at'> = {
            contract_id: selectedContractId,
            date: new Date(entry.date),
            start_time: entry.startTime || null,
            end_time: entry.endTime || null,
            break_minutes: entry.breakMinutes || 0,
            description: entry.description || null,
            is_holiday: entry.isHoliday || false,
            is_sick: entry.isSick || false,
            is_vacation: entry.isVacation || false
          };
          
          if (existingEntry) {
            // Verificar se houve alterações
            const hasChanges = 
              existingEntry.start_time !== entryData.start_time ||
              existingEntry.end_time !== entryData.end_time ||
              existingEntry.break_minutes !== entryData.break_minutes ||
              existingEntry.description !== entryData.description ||
              existingEntry.is_holiday !== entryData.is_holiday ||
              existingEntry.is_sick !== entryData.is_sick ||
              existingEntry.is_vacation !== entryData.is_vacation;
            
            console.log('🔍 DEBUG - Existing entry found, checking changes:', {
              hasChanges,
              existingId: existingEntry.id,
              changes: {
                start_time: { old: existingEntry.start_time, new: entryData.start_time },
                end_time: { old: existingEntry.end_time, new: entryData.end_time },
                break_minutes: { old: existingEntry.break_minutes, new: entryData.break_minutes }
              }
            });
            
            if (hasChanges) {
              // Atualizar entrada existente
              console.log('🔍 DEBUG - Updating existing entry:', existingEntry.id);
              const updated = await payrollService.updateTimeEntry(existingEntry.id, entryData, user.id, selectedContractId);
              savedEntries.push(updated);
            } else {
              // Manter entrada existente sem alterações
              console.log('🔍 DEBUG - No changes, keeping existing entry:', existingEntry.id);
              savedEntries.push(existingEntry);
            }
          } else {
            // Criar nova entrada
            console.log('🔍 DEBUG - Creating new entry for date:', dateStr);
            const saved = await payrollService.createTimeEntry(user.id, selectedContractId!, entryData);
            savedEntries.push(saved);
          }
        } else if (existingEntry) {
          // Entrada não tem dados válidos mas existe na base de dados - deletar
          await payrollService.deleteTimeEntry(existingEntry.id, user?.id, selectedContractId);
        }
      }

      // Atualizar lista de entradas existentes
      setExistingEntries(savedEntries);

      // As entradas já estão em savedEntries, não é necessário processamento adicional

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

      // Calcular bónus de performance automáticos
      try {
        const weekStart = new Date(selectedWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const bonusResults = await performanceBonusService.calculateAndSavePerformanceBonuses(
          user.id,
          selectedContractId!,
          weekStart,
          weekEnd
        );
        
        if (bonusResults.length > 0) {
          const appliedBonuses = bonusResults.filter(result => result.threshold_met);
          if (appliedBonuses.length > 0) {
            const totalBonus = appliedBonuses.reduce((sum, result) => sum + (result.applied_bonus_amount || 0), 0);
            toast({
              title: 'Bónus de Performance Calculados',
              description: `${appliedBonuses.length} bónus aplicados totalizando ${formatCurrency(totalBonus)}.`,
              duration: 5000
            });
          }
        }
      } catch (error) {
        console.error('Erro ao calcular bónus de performance:', error);
        // Não bloquear o salvamento por erro nos bónus
      }

      toast({
        title: 'Timesheet Salvo',
        description: `${savedEntries.length} entradas de tempo foram salvas.`
      });

      onSave?.(savedEntries);
      console.log('🔄 DEBUG - Calling loadExistingEntries after save...');
      await loadExistingEntries();
      console.log('🔄 DEBUG - loadExistingEntries completed after save');
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
  const selectedContract = contracts.find(c => c.id === selectedContractId) || activeContract;
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

  if (!selectedContract) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Selecione um contrato para ver a timesheet.</p>
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
              <Select value={selectedContractId || ''} onValueChange={(value) => {
                const contract = contracts.find(c => c.id === value);
                if (contract) {
                  setActiveContract(contract);
                }
              }}>
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
              <Label>Horas Regulares</Label>
              <div className="text-2xl font-bold text-green-600">
                {calculateWeekRegularTotal().toFixed(2)}h
              </div>
            </div>
            <div>
              <Label>Horas Extras</Label>
              <div className={`text-2xl font-bold ${
                calculateWeekOvertimeTotal() > 0 ? 'text-amber-600' : 'text-green-600'
              }`}>
                {calculateWeekOvertimeTotal().toFixed(2)}h
              </div>
            </div>
            <div>
              <Label>Total da Semana</Label>
              <div className="text-2xl font-bold text-blue-600">
                {weekTotal.toFixed(2)}h
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
                    setSelectedWeek(getWeekStart(currentDate).toISOString().split('T')[0]);
                  }}
                  variant="outline" 
                  size="sm"
                  disabled={weekNavigationLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center flex items-center justify-center gap-2">
                  {weekNavigationLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  Semana {getWeekNumber(new Date(selectedWeek))}
                </span>
                <Button 
                  onClick={() => {
                    const currentDate = new Date(selectedWeek);
                    currentDate.setDate(currentDate.getDate() + 7);
                    setSelectedWeek(getWeekStart(currentDate).toISOString().split('T')[0]);
                  }}
                  variant="outline" 
                  size="sm"
                  disabled={weekNavigationLoading}
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
          <div className="overflow-x-auto relative">
            {weekNavigationLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-4 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Carregando semana...</span>
                </div>
              </div>
            )}
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
                    <TableRow key={`${entry.date}-${index}`}>
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
                          {dayIndex >= 0 ? dayNames[weekDays[dayIndex].getDay()] : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={(() => {
                            const value = entry.startTime || '';
                            console.log('🔄 DEBUG - startTime RENDER:', { index, entryDate: entry.date, value, entry });
                            return value;
                          })()}
                          onChange={(e) => {
                            console.log('🔄 DEBUG - startTime onChange:', { index, oldValue: entry.startTime, newValue: e.target.value });
                            updateEntry(index, 'startTime', e.target.value);
                          }}
                          disabled={(entry.isHoliday || entry.isSick || entry.isVacation) && !entry.isException}
                          className="w-[120px]"
                          aria-label="Hora de início"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={(() => {
                            const value = entry.endTime || '';
                            console.log('🔄 DEBUG - endTime RENDER:', { index, entryDate: entry.date, value, entry });
                            return value;
                          })()}
                          onChange={(e) => {
                            console.log('🔄 DEBUG - endTime onChange:', { index, oldValue: entry.endTime, newValue: e.target.value });
                            updateEntry(index, 'endTime', e.target.value);
                          }}
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
                          {(() => {
                            const hoursBreakdown = calculateDayHoursWithOT(entry);
                            const totalHours = hoursBreakdown.totalHours;
                            return (
                              <>
                                <Badge variant={totalHours > 8 ? 'destructive' : 'default'}>
                                  {totalHours.toFixed(2)}h
                                </Badge>
                                {hoursBreakdown.overtimeHours > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    <span className="text-green-600">{hoursBreakdown.regularHours.toFixed(1)}h</span>
                                    {' + '}
                                    <span className="text-amber-600">{hoursBreakdown.overtimeHours.toFixed(1)}h OT</span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
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

export default WeeklyTimesheetForm;