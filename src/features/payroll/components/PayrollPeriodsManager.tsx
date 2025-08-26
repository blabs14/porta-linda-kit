import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Settings,
  FileText,
  Utensils,
  DollarSign,
  Users,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PayrollPeriod, PayrollContract } from '../types';
import { payrollService } from '../services/payrollService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

interface ConfigurationStatus {
  isValid: boolean;
  missingConfigurations: string[];
  configurationDetails: {
    contract: { isValid: boolean; details: string[] };
    overtimePolicy: { isValid: boolean; details: string[] };
    mealAllowance: { isValid: boolean; details: string[] };
    deductions: { isValid: boolean; details: string[] };
    holidays: { isValid: boolean; details: string[] };
  };
}

const PayrollPeriodsManager: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [contract, setContract] = useState<PayrollContract | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigurationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Carregar contrato ativo
      const activeContract = await payrollService.getActiveContract(user.id);
      setContract(activeContract);

      if (activeContract) {
        // Carregar status das configurações
        const status = await payrollService.getPayrollConfigurationStatus(user.id, activeContract.id);
        setConfigStatus(status);

        // Carregar períodos existentes
        const existingPeriods = await payrollService.getPayrollPeriods(user.id, activeContract.id);
        setPeriods(existingPeriods);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados dos períodos de folha de pagamento.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleCreatePeriod = async () => {
    if (!user?.id || !contract?.id) return;

    try {
      setCreating(true);
      
      await payrollService.createPayrollPeriod(
        user.id,
        contract.id,
        selectedYear,
        selectedMonth
      );

      toast({
        title: 'Sucesso',
        description: `Período de ${months.find(m => m.value === selectedMonth)?.label}/${selectedYear} criado com sucesso.`,
      });

      setShowCreateDialog(false);
      await loadData();
    } catch (error) {
      console.error('Erro ao criar período:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar período de folha de pagamento.',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'Rascunho', variant: 'secondary' as const },
      processing: { label: 'Processando', variant: 'default' as const },
      completed: { label: 'Concluído', variant: 'default' as const },
      approved: { label: 'Aprovado', variant: 'default' as const }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!contract) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Nenhum contrato ativo encontrado. 
          <Button 
            variant="link" 
            className="p-0 h-auto font-normal" 
            onClick={() => navigate('/personal/payroll/config')}
          >
            Criar contrato
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status das Configurações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Status das Configurações
          </CardTitle>
          <CardDescription>
            Verificação das configurações necessárias para criar períodos de folha de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configStatus && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(configStatus.configurationDetails.contract.isValid)}
                  <span className="text-sm font-medium">Contrato</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(configStatus.configurationDetails.overtimePolicy.isValid)}
                  <span className="text-sm font-medium">Horas Extras</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(configStatus.configurationDetails.mealAllowance.isValid)}
                  <span className="text-sm font-medium">Subsídio Alimentação</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(configStatus.configurationDetails.deductions.isValid)}
                  <span className="text-sm font-medium">Descontos</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(configStatus.configurationDetails.holidays.isValid)}
                  <span className="text-sm font-medium">Feriados</span>
                </div>
              </div>

              {!configStatus.isValid && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Configurações em falta:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {configStatus.missingConfigurations.map((config, index) => (
                          <li key={index}>{config}</li>
                        ))}
                      </ul>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto font-normal" 
                        onClick={() => navigate('/personal/payroll/config')}
                      >
                        Ir para configurações
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Períodos de Folha de Pagamento */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Períodos de Folha de Pagamento
              </CardTitle>
              <CardDescription>
                Gerir períodos mensais de processamento da folha de pagamento
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button 
                  disabled={!configStatus?.isValid}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Criar Período
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Período</DialogTitle>
                  <DialogDescription>
                    Selecione o mês e ano para o novo período de folha de pagamento
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="month">Mês</Label>
                      <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar mês" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month.value} value={month.value.toString()}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Ano</Label>
                      <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar ano" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreatePeriod} disabled={creating}>
                      {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Criar Período
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {periods.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum período de folha de pagamento encontrado</p>
              {configStatus?.isValid && (
                <p className="text-sm text-muted-foreground mt-2">
                  Clique em "Criar Período" para começar
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Salário Bruto</TableHead>
                  <TableHead>Salário Líquido</TableHead>
                  <TableHead>Data Criação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      {months.find(m => m.value === period.month)?.label} {period.year}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(period.status)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(period.gross_salary_cents / 100)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(period.net_salary_cents / 100)}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(period.created_at), 'dd/MM/yyyy', { locale: pt })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export { PayrollPeriodsManager };