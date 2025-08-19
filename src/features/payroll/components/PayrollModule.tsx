import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Clock, 
  Car, 
  Calendar, 
  Calculator,
  FileText,
  TrendingUp,
  Users,
  Euro,
  ChevronRight
} from 'lucide-react';
import { PayrollSetupPage } from './PayrollSetupPage';
import { PayrollTimesheetPage } from './PayrollTimesheetPage';
import { PayrollMileagePage } from './PayrollMileagePage';
import { PayrollPeriodPage } from './PayrollPeriodPage';

type PayrollView = 'overview' | 'setup' | 'timesheet' | 'mileage' | 'period';

interface PayrollModuleProps {
  initialView?: PayrollView;
  initialPeriod?: { year: number; month: number };
}

export function PayrollModule({ 
  initialView = 'overview',
  initialPeriod = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
}: PayrollModuleProps) {
  const [currentView, setCurrentView] = useState<PayrollView>(initialView);
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);

  const navigateToView = (view: PayrollView, period?: { year: number; month: number }) => {
    setCurrentView(view);
    if (period) {
      setSelectedPeriod(period);
    }
  };

  const getCurrentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const getSelectedMonthKey = () => {
    return `${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, '0')}`;
  };

  const renderOverview = () => {
    const currentMonth = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Folha de Pagamento</h1>
          <p className="text-muted-foreground">
            Gestão completa de timesheets, quilometragem e cálculos salariais
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigateToView('timesheet')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Timesheet</h3>
                  <p className="text-sm text-muted-foreground">Registar horas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigateToView('mileage')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Car className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Quilometragem</h3>
                  <p className="text-sm text-muted-foreground">Gerir viagens</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigateToView('period', { year: new Date().getFullYear(), month: new Date().getMonth() + 1 })}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calculator className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Período Atual</h3>
                  <p className="text-sm text-muted-foreground">Ver cálculos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigateToView('setup')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Settings className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Configuração</h3>
                  <p className="text-sm text-muted-foreground">Contratos & políticas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Month Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Resumo de {currentMonth}
                </CardTitle>
                <CardDescription>
                  Visão geral do período atual
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigateToView('period', { year: new Date().getFullYear(), month: new Date().getMonth() + 1 })}
              >
                Ver Detalhes
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Horas Registadas</span>
                </div>
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Car className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Quilómetros</span>
                </div>
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Euro className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Valor Calculado</span>
                </div>
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-muted-foreground">Estimativa</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Status</span>
                </div>
                <Badge variant="secondary">Em Progresso</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription>
              Últimas ações no módulo de folha de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Timesheet em branco</p>
                  <p className="text-xs text-muted-foreground">Nenhuma entrada de tempo registada esta semana</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigateToView('timesheet')}>
                  Registar
                </Button>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 bg-green-100 rounded">
                  <Car className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Sem viagens registadas</p>
                  <p className="text-xs text-muted-foreground">Nenhuma viagem de quilometragem este mês</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigateToView('mileage')}>
                  Adicionar
                </Button>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 bg-orange-100 rounded">
                  <Settings className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Configuração pendente</p>
                  <p className="text-xs text-muted-foreground">Configure contratos e políticas para começar</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigateToView('setup')}>
                  Configurar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Navegação Rápida</CardTitle>
            <CardDescription>
              Acesso direto às funcionalidades principais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" onClick={() => navigateToView('setup')}>
                <Settings className="h-6 w-6" />
                <span className="text-sm">Configuração</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" onClick={() => navigateToView('timesheet')}>
                <Clock className="h-6 w-6" />
                <span className="text-sm">Timesheet</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" onClick={() => navigateToView('mileage')}>
                <Car className="h-6 w-6" />
                <span className="text-sm">Quilometragem</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" onClick={() => navigateToView('period')}>
                <Calculator className="h-6 w-6" />
                <span className="text-sm">Períodos</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'setup':
        return <PayrollSetupPage />;
      case 'timesheet':
        return <PayrollTimesheetPage />;
      case 'mileage':
        return <PayrollMileagePage />;
      case 'period':
        return <PayrollPeriodPage year={selectedPeriod.year} month={selectedPeriod.month} />;
      default:
        return renderOverview();
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'setup': return 'Configuração';
      case 'timesheet': return 'Timesheet';
      case 'mileage': return 'Quilometragem';
      case 'period': return `Período ${getSelectedMonthKey()}`;
      default: return 'Folha de Pagamento';
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      {currentView !== 'overview' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigateToView('overview')}
            className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
          >
            Folha de Pagamento
          </Button>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{getViewTitle()}</span>
        </div>
      )}

      {/* Main Content */}
      {renderCurrentView()}
    </div>
  );
}

export default PayrollModule;