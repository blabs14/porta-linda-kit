import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, ChevronLeft, ChevronRight, Calendar, BarChart3, Users, AlertTriangle } from 'lucide-react';
import { PayrollTimeEntry, PayrollContract } from '../types';
import { payrollService } from '../services/payrollService';
import { WeeklyTimesheetForm } from './WeeklyTimesheetForm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface WeekSummary {
  weekStart: Date;
  totalHours: number;
  overtimeHours: number;
  entriesCount: number;
  hasEntries: boolean;
}

export function PayrollTimesheetPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<PayrollContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Começar na segunda-feira da semana atual
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Domingo = 0, então -6 para voltar à segunda
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [weekSummaries, setWeekSummaries] = useState<WeekSummary[]>([]);

  useEffect(() => {
    loadContracts();
  }, []);

  useEffect(() => {
    if (selectedContractId) {
      loadWeekSummaries();
    }
  }, [selectedContractId]);

  const loadContracts = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await payrollService.getContracts(user.id);
      const activeContracts = data.filter(c => c.is_active);
      setContracts(activeContracts);
      
      if (!selectedContractId && activeContracts.length > 0) {
        setSelectedContractId(activeContracts[0].id);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar contratos.',
        variant: 'destructive'
      });
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeekSummaries = async () => {
    if (!selectedContractId) return;

    try {
      // Carregar últimas 8 semanas
      const summaries: WeekSummary[] = [];
      
      for (let i = -4; i <= 3; i++) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(currentWeekStart.getDate() + (i * 7));
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const entries = await payrollService.getTimeEntries(
          user.id,
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0]
        );
        
        const totalHours = entries.reduce((total, entry) => {
          if (entry.is_holiday || entry.is_sick || !entry.start_time || !entry.end_time) {
            return total;
          }
          
          const start = new Date(`${entry.entry_date.toISOString().split('T')[0]}T${entry.start_time}`);
          const end = new Date(`${entry.entry_date.toISOString().split('T')[0]}T${entry.end_time}`);
          
          if (end > start) {
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            const breakHours = (entry.break_minutes || 0) / 60;
            return total + Math.max(0, hours - breakHours);
          }
          
          return total;
        }, 0);
        
        const selectedContract = contracts.find(c => c.id === selectedContractId);
        const standardWeeklyHours = selectedContract?.weekly_hours || 40;
        const overtimeHours = Math.max(0, totalHours - standardWeeklyHours);
        
        summaries.push({
          weekStart,
          totalHours,
          overtimeHours,
          entriesCount: entries.length,
          hasEntries: entries.length > 0
        });
      }
      
      setWeekSummaries(summaries);
    } catch (error) {
      console.error('Error loading week summaries:', error);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  const handleTimesheetSave = async (entries: PayrollTimeEntry[]) => {
    toast({
      title: 'Timesheet Salvo',
      description: `${entries.length} entradas foram salvas com sucesso.`
    });
    
    // Recarregar resumos das semanas
    await loadWeekSummaries();
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + mondayOffset);
    thisMonday.setHours(0, 0, 0, 0);
    
    return currentWeekStart.getTime() === thisMonday.getTime();
  };

  const getCurrentWeekSummary = (): WeekSummary | undefined => {
    return weekSummaries.find(summary => 
      summary.weekStart.getTime() === currentWeekStart.getTime()
    );
  };

  const selectedContract = contracts.find(c => c.id === selectedContractId);
  const currentSummary = getCurrentWeekSummary();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Carregando timesheets...</span>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Nenhum contrato ativo encontrado. 
          <a href="/payroll/setup" className="underline ml-1">Configure um contrato</a> 
          antes de usar o timesheet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Navegação */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-6 w-6" />
                Timesheet - {selectedContract?.employee_name}
              </CardTitle>
              <CardDescription>
                Gerencie as horas de trabalho semanais
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Seleção de Contrato */}
              <select
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                {contracts.map(contract => (
                  <option key={contract.id} value={contract.id}>
                    {contract.employee_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Navegação de Semanas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Semana Anterior
            </Button>
            
            <div className="text-center">
              <div className="text-lg font-semibold">
                {currentWeekStart.toLocaleDateString('pt-PT')} - {' '}
                {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT')}
              </div>
              <div className="text-sm text-muted-foreground">
                {isCurrentWeek() ? (
                  <Badge>Semana Atual</Badge>
                ) : (
                  <Button variant="link" size="sm" onClick={goToCurrentWeek}>
                    <Calendar className="mr-1 h-3 w-3" />
                    Ir para Semana Atual
                  </Button>
                )}
              </div>
            </div>
            
            <Button variant="outline" onClick={() => navigateWeek('next')}>
              Próxima Semana
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Resumo da Semana Atual */}
          {currentSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {currentSummary.totalHours.toFixed(1)}h
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  currentSummary.overtimeHours > 0 ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {currentSummary.overtimeHours.toFixed(1)}h
                </div>
                <div className="text-sm text-muted-foreground">Horas Extras</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {currentSummary.entriesCount}
                </div>
                <div className="text-sm text-muted-foreground">Entradas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {selectedContract?.weekly_hours || 40}h
                </div>
                <div className="text-sm text-muted-foreground">Padrão</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Semanas */}
      {weekSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Histórico de Semanas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {weekSummaries.map((summary, index) => {
                const isSelected = summary.weekStart.getTime() === currentWeekStart.getTime();
                const weekEnd = new Date(summary.weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
                
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setCurrentWeekStart(new Date(summary.weekStart))}
                  >
                    <div className="text-sm font-medium mb-1">
                      {summary.weekStart.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })} - {' '}
                      {weekEnd.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{summary.totalHours.toFixed(1)}h</span>
                      {summary.overtimeHours > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          +{summary.overtimeHours.toFixed(1)}h
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1">
                      {summary.hasEntries ? (
                        <Badge variant="outline" className="text-xs">
                          {summary.entriesCount} entradas
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Sem entradas
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Timesheet */}
      <WeeklyTimesheetForm
        weekStart={currentWeekStart}
        contractId={selectedContractId}
        onSave={handleTimesheetSave}
      />
    </div>
  );
}