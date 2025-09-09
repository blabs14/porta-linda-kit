import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Clock, Calendar, TrendingUp, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { payrollService } from '../services/payrollService';
import { createOvertimeExtractionService } from '../services/overtimeExtraction.service';
import { logger } from '@/shared/lib/logger';
import type { TimesheetEntry, OvertimeBreakdown } from '../types';

interface OvertimeDetailData {
  breakdown: OvertimeBreakdown;
  timesheetEntries: TimesheetEntry[];
  month: number;
  year: number;
}

interface MonthlyOvertimeStats {
  totalHours: number;
  totalPay: number;
  dayHours: number;
  nightHours: number;
  weekendHours: number;
  holidayHours: number;
  averageHoursPerDay: number;
  daysWithOvertime: number;
}

export default function PayrollOvertimeDetailPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [overtimeData, setOvertimeData] = useState<OvertimeDetailData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [contract, setContract] = useState<any>(null);
  const [stats, setStats] = useState<MonthlyOvertimeStats | null>(null);

  const loadTimesheetEntries = async (userId: string, contractId: string, year: number, month: number): Promise<TimesheetEntry[]> => {
    try {
      // Calcular datas de início e fim do mês
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Buscar entradas, leaves, feriados e vacations
      const [entries, leaves, holidays, vacations] = await Promise.all([
        payrollService.getTimeEntries(userId, contractId, startDateStr, endDateStr),
        payrollService.getLeavesForWeek(userId, contractId, startDateStr, endDateStr),
        payrollService.getHolidays(userId, year, contractId),
        payrollService.getVacations(userId, contractId, year)
      ]);

      // Converter para TimesheetEntry
      const timesheetEntries: TimesheetEntry[] = entries.map(entry => ({
        date: entry.date,
        startTime: entry.start_time,
        endTime: entry.end_time,
        breakMinutes: entry.break_minutes || 0,
        isHoliday: holidays?.some(h => h.date === entry.date) || false,
        isVacation: vacations?.some(v => 
          new Date(entry.date) >= new Date(v.start_date) && 
          new Date(entry.date) <= new Date(v.end_date)
        ) || false,
        isLeave: leaves?.some(l => l.date === entry.date) || false
      }));

      return timesheetEntries;
    } catch (error) {
      console.error('Erro ao carregar entradas da timesheet:', error);
      return [];
    }
  };

  const calculateStats = (breakdown: OvertimeBreakdown, entries: TimesheetEntry[]): MonthlyOvertimeStats => {
    const daysWithOvertime = entries.filter(entry => {
      const totalMinutes = calculateWorkMinutes(entry);
      return totalMinutes > (8 * 60); // Mais de 8 horas
    }).length;

    const workingDays = entries.filter(entry => 
      !entry.isHoliday && !entry.isVacation && !entry.isLeave
    ).length;

    return {
      totalHours: breakdown.totalOvertimeHours,
      totalPay: breakdown.totalOvertimePay,
      dayHours: breakdown.dayOvertimeHours,
      nightHours: breakdown.nightOvertimeHours,
      weekendHours: breakdown.weekendOvertimeHours,
      holidayHours: breakdown.holidayOvertimeHours,
      averageHoursPerDay: workingDays > 0 ? breakdown.totalOvertimeHours / workingDays : 0,
      daysWithOvertime
    };
  };

  const calculateWorkMinutes = (entry: TimesheetEntry): number => {
    if (!entry.startTime || !entry.endTime) return 0;
    
    const [startHour, startMin] = entry.startTime.split(':').map(Number);
    const [endHour, endMin] = entry.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    let totalMinutes = endMinutes - startMinutes;
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Trabalho que cruza meia-noite
    
    return Math.max(0, totalMinutes - (entry.breakMinutes || 0));
  };

  const loadOvertimeData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Buscar contrato ativo
      const activeContract = await payrollService.getActiveContract(user.id);
      setContract(activeContract);
      
      if (!activeContract?.id) {
        toast({
          title: "Contrato não encontrado",
          description: "Nenhum contrato ativo foi encontrado.",
          variant: "destructive",
        });
        return;
      }

      // Buscar entradas da timesheet
      const timesheetEntries = await loadTimesheetEntries(user.id, activeContract.id, selectedYear, selectedMonth);
      
      if (timesheetEntries.length === 0) {
        setOvertimeData(null);
        setStats(null);
        toast({
          title: "Sem dados",
          description: "Nenhuma entrada de timesheet encontrada para o período selecionado.",
          variant: "default",
        });
        return;
      }

      // Buscar política de horas extras e feriados
      const [otPolicy, holidays] = await Promise.all([
        payrollService.getActiveOTPolicy(user.id, activeContract.id),
        payrollService.getHolidays(user.id, selectedYear, activeContract.id)
      ]);
      
      if (!otPolicy) {
        toast({
          title: "Política não encontrada",
          description: "Nenhuma política de horas extras ativa foi encontrada.",
          variant: "destructive",
        });
        return;
      }

      // Calcular taxa horária
      const hourlyRateCents = Math.round(activeContract.base_salary_cents / (activeContract.weekly_hours * 4.33));
      
      // Criar serviço de extração de horas extras
      const overtimeService = createOvertimeExtractionService(
        otPolicy,
        holidays || [],
        hourlyRateCents
      );
      
      // Extrair horas extras
      const breakdown = overtimeService.extractOvertimeFromTimesheet(timesheetEntries);
      
      // Calcular estatísticas
      const monthlyStats = calculateStats(breakdown, timesheetEntries);
      
      setOvertimeData({
        breakdown,
        timesheetEntries,
        month: selectedMonth,
        year: selectedYear
      });
      setStats(monthlyStats);
      
      // Mostrar avisos se existirem
      if (breakdown.validationWarnings.length > 0) {
        toast({
          title: "Avisos encontrados",
          description: `${breakdown.validationWarnings.length} aviso(s) no cálculo de horas extras.`,
          variant: "default",
        });
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados de horas extras:', error);
      logger.error('Error loading overtime data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de horas extras.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  };

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  };

  const getOvertimeTypeColor = (type: string): string => {
    switch (type) {
      case 'day': return 'bg-blue-100 text-blue-800';
      case 'night': return 'bg-purple-100 text-purple-800';
      case 'weekend': return 'bg-orange-100 text-orange-800';
      case 'holiday': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportToCSV = () => {
    if (!overtimeData) return;
    
    const headers = ['Data', 'Início', 'Fim', 'Pausa (min)', 'Horas Trabalhadas', 'Horas Extras', 'Tipo'];
    const rows = overtimeData.timesheetEntries.map(entry => {
      const workMinutes = calculateWorkMinutes(entry);
      const workHours = workMinutes / 60;
      const overtimeHours = Math.max(0, workHours - 8);
      
      let type = 'Normal';
      if (entry.isHoliday) type = 'Feriado';
      else if (new Date(entry.date).getDay() === 0 || new Date(entry.date).getDay() === 6) type = 'Fim de semana';
      
      return [
        entry.date,
        entry.startTime || '',
        entry.endTime || '',
        entry.breakMinutes?.toString() || '0',
        formatHours(workHours),
        formatHours(overtimeHours),
        type
      ];
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `horas-extras-${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.csv`;
    link.click();
  };

  useEffect(() => {
    loadOvertimeData();
  }, [user, selectedMonth, selectedYear]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detalhes de Horas Extras</h1>
          <p className="text-muted-foreground">
            Análise detalhada das horas extras para {monthNames[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            {monthNames.map((name, index) => (
              <option key={index} value={index + 1}>{name}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <Button onClick={loadOvertimeData} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {overtimeData && (
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">A carregar dados...</span>
        </div>
      )}

      {!isLoading && !overtimeData && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sem dados disponíveis</h3>
              <p className="text-muted-foreground">
                Nenhuma entrada de timesheet encontrada para o período selecionado.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && overtimeData && stats && (
        <>
          {/* Estatísticas Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Horas Extras</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatHours(stats.totalHours)}</div>
                <p className="text-xs text-muted-foreground">
                  Média: {formatHours(stats.averageHoursPerDay)} por dia
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalPay)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.daysWithOvertime} dias com horas extras
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Horas Diurnas</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatHours(stats.dayHours)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(overtimeData.breakdown.dayOvertimePay)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Horas Noturnas</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatHours(stats.nightHours)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(overtimeData.breakdown.nightOvertimePay)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown por Tipo */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown por Tipo de Hora Extra</CardTitle>
              <CardDescription>
                Distribuição das horas extras por categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Diurnas</span>
                    <Badge className={getOvertimeTypeColor('day')}>
                      {formatHours(stats.dayHours)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(overtimeData.breakdown.dayOvertimePay)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Noturnas</span>
                    <Badge className={getOvertimeTypeColor('night')}>
                      {formatHours(stats.nightHours)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(overtimeData.breakdown.nightOvertimePay)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Fim de Semana</span>
                    <Badge className={getOvertimeTypeColor('weekend')}>
                      {formatHours(stats.weekendHours)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(overtimeData.breakdown.weekendOvertimePay)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Feriados</span>
                    <Badge className={getOvertimeTypeColor('holiday')}>
                      {formatHours(stats.holidayHours)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(overtimeData.breakdown.holidayOvertimePay)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avisos */}
          {overtimeData.breakdown.validationWarnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Avisos encontrados:</strong>
                <ul className="mt-2 list-disc list-inside">
                  {overtimeData.breakdown.validationWarnings.map((warning, index) => (
                    <li key={index} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Detalhes Diários */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes Diários</CardTitle>
              <CardDescription>
                Registo detalhado de todas as entradas do mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overtimeData.timesheetEntries.map((entry, index) => {
                  const workMinutes = calculateWorkMinutes(entry);
                  const workHours = workMinutes / 60;
                  const overtimeHours = Math.max(0, workHours - 8);
                  const isWeekend = new Date(entry.date).getDay() === 0 || new Date(entry.date).getDay() === 6;
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium">
                          {new Date(entry.date).toLocaleDateString('pt-PT', {
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.startTime} - {entry.endTime}
                        </div>
                        {entry.breakMinutes && entry.breakMinutes > 0 && (
                          <Badge variant="outline">
                            Pausa: {entry.breakMinutes}m
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <span className="font-medium">{formatHours(workHours)}</span>
                          {overtimeHours > 0 && (
                            <span className="text-orange-600 ml-2">
                              (+{formatHours(overtimeHours)})
                            </span>
                          )}
                        </div>
                        
                        <div className="flex space-x-1">
                          {entry.isHoliday && (
                            <Badge className={getOvertimeTypeColor('holiday')}>Feriado</Badge>
                          )}
                          {entry.isVacation && (
                            <Badge variant="outline">Férias</Badge>
                          )}
                          {entry.isLeave && (
                            <Badge variant="outline">Licença</Badge>
                          )}
                          {isWeekend && !entry.isHoliday && (
                            <Badge className={getOvertimeTypeColor('weekend')}>Fim de semana</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}