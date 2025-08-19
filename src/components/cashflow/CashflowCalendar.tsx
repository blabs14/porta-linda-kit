import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { DailyCashflowSummary, CashflowEvent } from '../../types/cashflow';
import { formatCurrency } from '../../lib/utils';

interface CashflowCalendarProps {
  dailySummaries: DailyCashflowSummary[];
  currency?: string;
  onDateSelect?: (date: string) => void;
  selectedDate?: string;
}

interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  summary?: DailyCashflowSummary;
}

export function CashflowCalendar({ 
  dailySummaries, 
  currency = 'EUR', 
  onDateSelect,
  selectedDate 
}: CashflowCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Criar mapa de resumos por data para acesso rápido
  const summariesByDate = useMemo(() => {
    const map = new Map<string, DailyCashflowSummary>();
    dailySummaries.forEach(summary => {
      map.set(summary.date, summary);
    });
    return map;
  }, [dailySummaries]);

  // Gerar dias do calendário
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Primeiro dia do mês
    const firstDay = new Date(year, month, 1);
    // Último dia do mês
    const lastDay = new Date(year, month + 1, 0);
    
    // Primeiro dia da semana (domingo = 0)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Último dia da semana
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === month;
      const isToday = current.getTime() === today.getTime();
      const isSelected = selectedDate === dateStr;
      
      days.push({
        date: dateStr,
        dayNumber: current.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        summary: summariesByDate.get(dateStr)
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate, summariesByDate, selectedDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const handleDateClick = (day: CalendarDay) => {
    if (day.isCurrentMonth && onDateSelect) {
      onDateSelect(day.date);
    }
  };

  const getEventTypeColor = (eventType: string): string => {
    switch (eventType) {
      case 'recurring_income': return 'bg-green-100 text-green-800';
      case 'recurring_expense': return 'bg-red-100 text-red-800';
      case 'subscription': return 'bg-purple-100 text-purple-800';
      case 'goal_funding': return 'bg-blue-100 text-blue-800';
      case 'credit_card_due': return 'bg-orange-100 text-orange-800';
      case 'scheduled_transaction': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeLabel = (eventType: string): string => {
    switch (eventType) {
      case 'recurring_income': return 'Receita';
      case 'recurring_expense': return 'Despesa';
      case 'subscription': return 'Subscrição';
      case 'goal_funding': return 'Funding';
      case 'credit_card_due': return 'Cartão';
      case 'scheduled_transaction': return 'Agendada';
      default: return 'Outro';
    }
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Calendário de Fluxos
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[140px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* Cabeçalho dos dias da semana */}
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          
          {/* Dias do calendário */}
          {calendarDays.map((day, index) => (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`
                      relative p-1 min-h-[80px] border rounded-md cursor-pointer transition-colors
                      ${day.isCurrentMonth ? 'bg-background hover:bg-muted/50' : 'bg-muted/20 text-muted-foreground'}
                      ${day.isToday ? 'ring-2 ring-primary' : ''}
                      ${day.isSelected ? 'bg-primary/10 border-primary' : 'border-border'}
                    `}
                    onClick={() => handleDateClick(day)}
                  >
                    {/* Número do dia */}
                    <div className={`text-sm font-medium ${day.isToday ? 'text-primary' : ''}`}>
                      {day.dayNumber}
                    </div>
                    
                    {/* Resumo financeiro do dia */}
                    {day.summary && day.isCurrentMonth && (
                      <div className="mt-1 space-y-1">
                        {/* Saldo líquido */}
                        <div className={`text-xs flex items-center gap-1 ${
                          day.summary.net_flow_cents >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {day.summary.net_flow_cents >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {formatCurrency(day.summary.net_flow_cents / 100, currency)}
                        </div>
                        
                        {/* Badges de tipos de eventos */}
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(day.summary.events.map(e => e.type))).slice(0, 2).map(eventType => (
                            <Badge
                              key={eventType}
                              variant="secondary"
                              className={`text-xs px-1 py-0 ${getEventTypeColor(eventType)}`}
                            >
                              {getEventTypeLabel(eventType)}
                            </Badge>
                          ))}
                          {day.summary.events.length > 2 && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              +{day.summary.events.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                
                {/* Tooltip com detalhes */}
                {day.summary && day.isCurrentMonth && (
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-2">
                      <div className="font-medium">
                        {new Date(day.date).toLocaleDateString('pt-PT', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Receitas:</span>
                          <span className="text-green-600">
                            {formatCurrency(day.summary.total_income_cents / 100, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Despesas:</span>
                          <span className="text-red-600">
                            {formatCurrency(day.summary.total_expense_cents / 100, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-1">
                          <span>Saldo:</span>
                          <span className={day.summary.net_flow_cents >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(day.summary.net_flow_cents / 100, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Saldo acumulado:</span>
                          <span>
                            {formatCurrency(day.summary.running_balance_cents / 100, currency)}
                          </span>
                        </div>
                      </div>
                      
                      {day.summary.events.length > 0 && (
                        <div className="border-t pt-2">
                          <div className="text-xs font-medium mb-1">
                            {day.summary.events.length} evento(s):
                          </div>
                          <div className="space-y-1">
                            {day.summary.events.slice(0, 3).map((event, idx) => (
                              <div key={idx} className="text-xs flex justify-between">
                                <span className="truncate">{event.description}</span>
                                <span className={event.is_income ? 'text-green-600' : 'text-red-600'}>
                                  {event.is_income ? '+' : '-'}{formatCurrency(event.amount_cents / 100, currency)}
                                </span>
                              </div>
                            ))}
                            {day.summary.events.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                ... e mais {day.summary.events.length - 3} evento(s)
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}