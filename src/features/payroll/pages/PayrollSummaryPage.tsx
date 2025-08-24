import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';
import { useToast } from '../../../hooks/use-toast';
import { Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { Checkbox } from '../../../components/ui/checkbox';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { calculatePayroll } from '../services/calculation.service';
import { payrollService } from '../services/payrollService';
import { exportPayrollReport, downloadFile } from '../services/export.service';
import { ReportExport } from '../../../components/ReportExport';
import type { PayrollContract } from '../types';

interface MonthlyTotals {
  base: number;
  overtimeDay: number;
  overtimeNight: number;
  overtimeWeekend: number;
  overtimeHoliday: number;
  meal: number;
  vacation: number;
  christmas: number;
  mileage: number;
  gross: number;
  irs: number;
  socialSecurity: number;
  net: number;
}

interface PayslipData {
  gross: string;
  net: string;
  irs: string;
  socialSecurity: string;
  meal: string;
  vacation: string;
  christmas: string;
}

interface Discrepancy {
  field: string;
  expected: number;
  actual: number;
  difference: number;
}

const PayrollSummaryPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isCalculating, setIsCalculating] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [contract, setContract] = useState<PayrollContract | null>(null);
  const [payslipData, setPayslipData] = useState<PayslipData>({
    gross: '',
    net: '',
    irs: '',
    socialSecurity: '',
    meal: '',
    vacation: '',
    christmas: ''
  });
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const currentMonth = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotals>({
    base: 0,
    overtimeDay: 0,
    overtimeNight: 0,
    overtimeWeekend: 0,
    overtimeHoliday: 0,
    meal: 0,
    vacation: 0,
    christmas: 0,
    mileage: 0,
    gross: 0,
    irs: 0,
    socialSecurity: 0,
    net: 0
  });

  const loadContract = async () => {
    if (!user) return;
    
    try {
      const contract = await payrollService.getActiveContract(user.id);
      setContract(contract);
    } catch (error) {
      console.error('Error loading contract:', error);
    }
  };

  const loadMonthlyTotals = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const activeContract = await payrollService.getActiveContract(user.id);
      setContract(activeContract);
      if (!activeContract?.id) {
        throw new Error('Nenhum contrato ativo encontrado');
      }
      
      const result = await calculatePayroll(user.id, activeContract.id, year, month);
      
      // O resultado está em result.calculation, não diretamente em result
      const calc = result.calculation;
      
      setMonthlyTotals({
        base: calc.regularPay || 0,
        overtimeDay: calc.overtimePayDay || 0,
        overtimeNight: calc.overtimePayNight || 0,
        overtimeWeekend: calc.overtimePayWeekend || 0,
        overtimeHoliday: calc.overtimePayHoliday || 0,
        meal: calc.mealAllowance || 0,
        vacation: 0, // Será adicionado quando implementado
        christmas: 0, // Será adicionado quando implementado
        mileage: calc.mileageReimbursement || 0,
        gross: calc.grossPay || 0,
        irs: calc.irsDeduction || 0,
        socialSecurity: calc.socialSecurityDeduction || 0,
        net: calc.netPay || 0
      });
    } catch (error) {
      console.error('Error loading monthly totals:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os totais do mês.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setIsCalculating(true);
    try {
      await loadMonthlyTotals();
      toast({
        title: "Mês recalculado",
        description: "Os valores foram atualizados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro no cálculo",
        description: "Não foi possível recalcular o mês.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    loadMonthlyTotals();
  }, [user]);

  const handleComparePayslip = () => {
    const newDiscrepancies: Discrepancy[] = [];
    
    if (payslipData.gross) {
      const actualGross = parseFloat(payslipData.gross);
      if (Math.abs(actualGross - monthlyTotals.gross) > 0.01) {
        newDiscrepancies.push({
          field: 'Salário Bruto',
          expected: monthlyTotals.gross,
          actual: actualGross,
          difference: actualGross - monthlyTotals.gross
        });
      }
    }

    if (payslipData.net) {
      const actualNet = parseFloat(payslipData.net);
      if (Math.abs(actualNet - monthlyTotals.net) > 0.01) {
        newDiscrepancies.push({
          field: 'Salário Líquido',
          expected: monthlyTotals.net,
          actual: actualNet,
          difference: actualNet - monthlyTotals.net
        });
      }
    }

    // Compare meal allowance if provided
    if (payslipData.meal && parseFloat(payslipData.meal) > 0) {
      const mealDiff = monthlyTotals.meal - parseFloat(payslipData.meal);
      if (Math.abs(mealDiff) > 0.01) {
        newDiscrepancies.push({
          field: 'Subsídio de Alimentação',
          expected: monthlyTotals.meal,
          actual: parseFloat(payslipData.meal),
          difference: mealDiff
        });
      }
    }

    setDiscrepancies(newDiscrepancies);
    setShowComparison(true);
    
    toast({
      title: "Comparação concluída",
      description: newDiscrepancies.length === 0 
        ? "Recibo confere com os cálculos" 
        : `Encontradas ${newDiscrepancies.length} discrepância(s)`,
      variant: newDiscrepancies.length === 0 ? "default" : "destructive"
    });
  };

  const handleExport = async (
    format: string,
    dateRange: { start: string; end: string },
    options?: { includeHours?: boolean; includeMileage?: boolean; includeConfig?: boolean }
  ) => {
    if (!user) return;
    
    try {
      const { blob, filename } = await exportPayrollReport(user.id, {
        format: format as 'csv' | 'pdf',
        dateRange,
        includeHours: options?.includeHours ?? true,
        includeMileage: options?.includeMileage ?? true,
        includeConfig: options?.includeConfig ?? false
      });
      
      downloadFile(blob, filename);
      
      toast({
        title: t('reports.exported'),
        description: t('reports.exportSuccess', { format: format.toUpperCase() }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('reports.exportError'),
        description: t('reports.exportErrorDescription'),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar dados do payroll...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumo do Payroll</h1>
          <p className="text-muted-foreground">{currentMonth}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRecalculate} 
            disabled={isCalculating}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            {isCalculating ? 'Calculando...' : 'Recalcular Mês'}
          </Button>
        </div>
      </div>

      {/* Totais do Mês */}
      <Card>
        <CardHeader>
          <CardTitle>Totais do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Salário Base</Label>
              <p className="text-2xl font-bold">{formatCurrency(monthlyTotals.base, 'pt-PT', contract?.currency || 'EUR')}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Horas Extra</Label>
              <div className="space-y-1">
                <p className="text-sm">Dia: {formatCurrency(monthlyTotals.overtimeDay, 'pt-PT', contract?.currency || 'EUR')}</p>
                <p className="text-sm">Noite: {formatCurrency(monthlyTotals.overtimeNight, 'pt-PT', contract?.currency || 'EUR')}</p>
                <p className="text-sm">Fim de semana: {formatCurrency(monthlyTotals.overtimeWeekend, 'pt-PT', contract?.currency || 'EUR')}</p>
                <p className="text-sm">Feriado: {formatCurrency(monthlyTotals.overtimeHoliday, 'pt-PT', contract?.currency || 'EUR')}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Subsídios</Label>
              <div className="space-y-1">
                <p className="text-sm">Alimentação: {formatCurrency(monthlyTotals.meal, 'pt-PT', contract?.currency || 'EUR')}</p>
                <p className="text-sm">Férias: {formatCurrency(monthlyTotals.vacation, 'pt-PT', contract?.currency || 'EUR')}</p>
                <p className="text-sm">Natal: {formatCurrency(monthlyTotals.christmas, 'pt-PT', contract?.currency || 'EUR')}</p>
                <p className="text-sm">Quilometragem: {formatCurrency(monthlyTotals.mileage, 'pt-PT', contract?.currency || 'EUR')}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Descontos</Label>
              <div className="space-y-1">
                <p className="text-sm">IRS: {formatCurrency(monthlyTotals.irs, 'pt-PT', contract?.currency || 'EUR')}</p>
                <p className="text-sm">Seg. Social: {formatCurrency(monthlyTotals.socialSecurity, 'pt-PT', contract?.currency || 'EUR')}</p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Total Bruto</Label>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(monthlyTotals.gross, 'pt-PT', contract?.currency || 'EUR')}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Total Líquido</Label>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(monthlyTotals.net, 'pt-PT', contract?.currency || 'EUR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparação com Recibo */}
      <Card>
        <CardHeader>
          <CardTitle>Comparar com Recibo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gross">Salário Bruto</Label>
              <Input
                id="gross"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={payslipData.gross}
                onChange={(e) => setPayslipData(prev => ({ ...prev, gross: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="net">Salário Líquido</Label>
              <Input
                id="net"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={payslipData.net}
                onChange={(e) => setPayslipData(prev => ({ ...prev, net: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="irs">IRS</Label>
              <Input
                id="irs"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={payslipData.irs}
                onChange={(e) => setPayslipData(prev => ({ ...prev, irs: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="socialSecurity">Segurança Social</Label>
              <Input
                id="socialSecurity"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={payslipData.socialSecurity}
                onChange={(e) => setPayslipData(prev => ({ ...prev, socialSecurity: e.target.value }))}
              />
            </div>
          </div>
          
          <Button onClick={handleComparePayslip} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Comparar
          </Button>
          
          {/* Discrepâncias */}
          {showComparison && (
            <div className="mt-4">
              <Separator className="mb-4" />
              <h3 className="font-semibold mb-2">Resultado da Comparação</h3>
              {discrepancies.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Recibo confere com os cálculos</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {discrepancies.map((disc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium">{disc.field}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Esperado: {formatCurrency(disc.expected, 'pt-PT', contract?.currency || 'EUR')}</p>
                        <p className="text-sm">Recibo: {formatCurrency(disc.actual, 'pt-PT', contract?.currency || 'EUR')}</p>
                        <p className={`text-sm font-medium ${
                          disc.difference > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          Diferença: {disc.difference > 0 ? '+' : ''}{formatCurrency(disc.difference, 'pt-PT', contract?.currency || 'EUR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações de Exportação */}
      <Card>
        <CardHeader>
          <CardTitle>Exportar Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportExport
            onExport={handleExport}
            extraControls={({ includeHours, includeMileage, includeConfig, setIncludeHours, setIncludeMileage, setIncludeConfig }) => (
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('payroll.includeInReports')}:</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-hours"
                      checked={includeHours}
                      onCheckedChange={setIncludeHours}
                      aria-describedby="include-hours-desc"
                    />
                    <Label htmlFor="include-hours" className="text-sm cursor-pointer">
                      {t('payroll.includeHours')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-mileage"
                      checked={includeMileage}
                      onCheckedChange={setIncludeMileage}
                      aria-describedby="include-mileage-desc"
                    />
                    <Label htmlFor="include-mileage" className="text-sm cursor-pointer">
                      {t('payroll.includeMileage')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-config"
                      checked={includeConfig}
                      onCheckedChange={setIncludeConfig}
                      aria-describedby="include-config-desc"
                    />
                    <Label htmlFor="include-config" className="text-sm cursor-pointer">
                      {t('payroll.includeConfig')}
                    </Label>
                  </div>
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollSummaryPage;