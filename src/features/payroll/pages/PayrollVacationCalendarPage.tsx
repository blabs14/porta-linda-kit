import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { payrollService } from '../services/payrollService';
import { useActiveContract } from '../hooks/useActiveContract';
import { LoadingSpinner } from '../../../components/ui/loading-states';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '../../../lib/utils';

interface Vacation {
  id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  is_approved: boolean;
  description?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  vacations: Vacation[];
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200'
};

const vacationColors = {
  vacation: 'bg-blue-50 border-blue-200'
};

const statusLabels = {
  pending: 'Pendente',
  approved: 'Aprovado'
};

export default function PayrollVacationCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeContract } = useActiveContract();

  useEffect(() => {
    loadVacations();
  }, [activeContract, currentDate]);

  const loadVacations = async () => {
    if (!activeContract?.id) return;
    
    try {
      setLoading(true);
      const data = await payrollService.getVacations(activeContract.user_id, activeContract.id);
      // Mapear PayrollVacation para interface Vacation do calendário
      const mappedVacations: Vacation[] = (data || []).map(vacation => ({
        id: vacation.id,
        start_date: vacation.start_date,
        end_date: vacation.end_date,
        days_count: vacation.days_count,
        is_approved: vacation.is_approved || false,
        description: vacation.description
      }));
      setVacations(mappedVacations);
    } catch (error) {
      console.error('Erro ao carregar férias:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    // Adicionar dias da semana anterior para completar a primeira semana
    const startCalendar = new Date(start);
    startCalendar.setDate(start.getDate() - start.getDay());
    
    // Adicionar dias da próxima semana para completar a última semana
    const endCalendar = new Date(end);
    endCalendar.setDate(end.getDate() + (6 - end.getDay()));
    
    const days = eachDayOfInterval({ start: startCalendar, end: endCalendar });
    
    return days.map(date => {
      const dayVacations = vacations.filter(vacation => {
        const startDate = parseISO(vacation.start_date);
        const endDate = parseISO(vacation.end_date);
        return date >= startDate && date <= endDate;
      });
      
      return {
        date,
        isCurrentMonth: isSameMonth(date, currentDate),
        vacations: dayVacations
      };
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Calendário de Férias</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium min-w-[200px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: pt })}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Períodos de Férias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const isToday = isSameDay(day.date, new Date());
              
              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[80px] p-1 border rounded-lg transition-colors",
                    day.isCurrentMonth
                      ? "bg-background border-border"
                      : "bg-muted/30 border-muted text-muted-foreground",
                    isToday && "ring-2 ring-primary ring-offset-1"
                  )}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day.date, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {day.vacations.map(vacation => {
                      const status = vacation.is_approved ? 'approved' : 'pending';
                      return (
                        <div
                          key={vacation.id}
                          className={cn(
                            "text-xs p-1 rounded border",
                            vacationColors.vacation
                          )}
                          title={`Férias - ${vacation.description || 'Sem descrição'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">
                              {vacation.days_count}d
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] px-1 py-0",
                                statusColors[status]
                              )}
                            >
                              {statusLabels[status]}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Tipo de Ausência</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-4 h-4 rounded border", vacationColors.vacation)} />
                  <span className="text-sm">Férias</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Estados</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${statusColors.pending}`}>
                    Pendente
                  </Badge>
                  <span className="text-sm">Aguarda aprovação</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${statusColors.approved}`}>
                    Aprovado
                  </Badge>
                  <span className="text-sm">Férias aprovadas</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}