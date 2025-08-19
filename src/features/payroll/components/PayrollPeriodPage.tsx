import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Calculator, 
  Calendar, 
  Euro, 
  FileText, 
  Download, 
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PayrollPeriod, PayrollItem, PayrollContract, PayrollCalculation } from '../types';
import { payrollService } from '../services/payrollService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, centsToEuros } from '../lib/calc';

interface PayrollPeriodPageProps {
  year: number;
  month: number;
}

export function PayrollPeriodPage({ year, month }: PayrollPeriodPageProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [contracts, setContracts] = useState<PayrollContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showRecalcDialog, setShowRecalcDialog] = useState(false);
  const [actualPayslipAmount, setActualPayslipAmount] = useState('');
  const [comparisonResult, setComparisonResult] = useState<{
    calculated: number;
    actual: number;
    difference: number;
    percentage: number;
  } | null>(null);

  const periodKey = `${year}-${String(month).padStart(2, '0')}`;

  useEffect(() => {
    loadPeriodData();
  }, [year, month]);

  const loadPeriodData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const [periodsData, itemsData, contractsData] = await Promise.all([
        payrollService.getPayrollPeriods(user.id),
        payrollService.getPayrollItems(user.id),
        payrollService.getContracts(user.id)
      ]);
      
      const currentPeriod = periodsData.find(p => p.period_key === periodKey);
      setPeriod(currentPeriod || null);
      
      if (currentPeriod) {
        const periodItems = itemsData.filter(item => item.period_id === currentPeriod.id);
        setItems(periodItems);
      } else {
        setItems([]);
      }
      
      setContracts(contractsData);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do período.',
        variant: 'destructive'
      });
      console.error('Error loading period data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setCalculating(true);
    try {
      await payrollService.recalculatePayroll(year, month);
      await loadPeriodData();
      setShowRecalcDialog(false);
      toast({
        title: 'Recálculo Concluído',
        description: 'A folha de pagamento foi recalculada com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro no Recálculo',
        description: 'Erro ao recalcular folha de pagamento.',
        variant: 'destructive'
      });
      console.error('Error recalculating payroll:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleCompareWithPayslip = () => {
    if (!period || !actualPayslipAmount) return;
    
    const actualAmount = parseFloat(actualPayslipAmount) * 100; // Convert to cents
    const calculatedAmount = period.total_amount_cents;
    const difference = actualAmount - calculatedAmount;
    const percentage = calculatedAmount > 0 ? (difference / calculatedAmount) * 100 : 0;
    
    setComparisonResult({
      calculated: calculatedAmount,
      actual: actualAmount,
      difference,
      percentage
    });
  };

  const exportPeriodData = () => {
    if (!period) return;
    
    const csvContent = [
      ['Tipo', 'Descrição', 'Quantidade', 'Valor Unitário (€)', 'Total (€)'].join(','),
      ...items.map(item => [
        item.item_type,
        `"${item.description}"`,
        item.quantity || 1,
        centsToEuros(item.unit_amount_cents).toFixed(2),
            centsToEuros(item.total_amount_cents).toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `folha-pagamento-${periodKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Rascunho</Badge>;
      case 'calculated':
        return <Badge variant="default"><Calculator className="mr-1 h-3 w-3" />Calculado</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />Aprovado</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-blue-500"><Euro className="mr-1 h-3 w-3" />Pago</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getItemsByType = () => {
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.item_type]) {
        acc[item.item_type] = [];
      }
      acc[item.item_type].push(item);
      return acc;
    }, {} as Record<string, PayrollItem[]>);
    
    return grouped;
  };

  const getTypeTotal = (type: string) => {
    return items
      .filter(item => item.item_type === type)
      .reduce((sum, item) => sum + item.total_amount_cents, 0);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'salary': return <Euro className="h-4 w-4" />;
      case 'overtime': return <Clock className="h-4 w-4" />;
      case 'meal_allowance': return <FileText className="h-4 w-4" />;
      case 'bonus': return <TrendingUp className="h-4 w-4" />;
      case 'mileage': return <Calculator className="h-4 w-4" />;
      case 'deduction': return <TrendingDown className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'salary': return 'Salário Base';
      case 'overtime': return 'Horas Extras';
      case 'meal_allowance': return 'Subsídio de Refeição';
      case 'bonus': return 'Bónus';
      case 'mileage': return 'Quilometragem';
      case 'deduction': return 'Deduções';
      default: return type;
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(year, month - 1);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    
    // This would typically update the URL or parent component state
    // For now, we'll just show a toast
    const newPeriod = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    toast({
      title: 'Navegação',
      description: `Navegar para ${newPeriod} (implementar navegação na rota)`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando período de folha de pagamento...</p>
        </div>
      </div>
    );
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  const itemsByType = getItemsByType();
  const typeOrder = ['salary', 'overtime', 'meal_allowance', 'bonus', 'mileage', 'deduction'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold capitalize">{monthName}</h1>
            <p className="text-muted-foreground">
              Folha de pagamento do período {periodKey}
            </p>
          </div>
          
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {period && getStatusBadge(period.status)}
        </div>
      </div>

      {/* Period Summary */}
      {period ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Resumo do Período
                </CardTitle>
                <CardDescription>
                  Calculado em {new Date(period.calculated_at).toLocaleDateString('pt-PT')}
                </CardDescription>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportPeriodData}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
                
                <Dialog open={showRecalcDialog} onOpenChange={setShowRecalcDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Recalcular
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Recalcular Folha de Pagamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          O recálculo irá processar novamente todas as entradas de tempo, 
                          viagens e políticas para este período. Os dados existentes serão substituídos.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowRecalcDialog(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleRecalculate} disabled={calculating}>
                          {calculating ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Recalculando...
                            </>
                          ) : (
                            'Confirmar Recálculo'
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Bruto</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(period.total_amount_cents)}
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Itens</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Contratos</p>
                <p className="text-2xl font-bold">{contracts.filter(c => c.is_active).length}</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  {getStatusBadge(period.status)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Período não calculado</h3>
            <p className="text-muted-foreground mb-4">
              Este período ainda não foi processado. Execute o cálculo para gerar a folha de pagamento.
            </p>
            <Button onClick={() => setShowRecalcDialog(true)}>
              <Calculator className="mr-2 h-4 w-4" />
              Calcular Período
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Detailed Breakdown */}
      {period && items.length > 0 && (
        <Tabs defaultValue="breakdown" className="space-y-4">
          <TabsList>
            <TabsTrigger value="breakdown">Detalhamento</TabsTrigger>
            <TabsTrigger value="comparison">Comparação</TabsTrigger>
          </TabsList>

          <TabsContent value="breakdown" className="space-y-4">
            {typeOrder.map(type => {
              const typeItems = itemsByType[type];
              if (!typeItems || typeItems.length === 0) return null;
              
              const typeTotal = getTypeTotal(type);
              
              return (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(type)}
                        {getTypeLabel(type)}
                      </div>
                      <div className="text-lg font-semibold">
                        {formatCurrency(typeTotal)}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {typeItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex-1">
                            <p className="font-medium">{item.description}</p>
                            {item.quantity && item.quantity !== 1 && (
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} × {formatCurrency(item.unit_amount_cents)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(item.total_amount_cents)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comparação com Recibo de Vencimento</CardTitle>
                <CardDescription>
                  Compare o valor calculado com o recibo de vencimento real.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="actual-amount">Valor do Recibo (€)</Label>
                    <Input
                      id="actual-amount"
                      type="number"
                      step="0.01"
                      value={actualPayslipAmount}
                      onChange={(e) => setActualPayslipAmount(e.target.value)}
                      placeholder="Ex: 1250.00"
                    />
                  </div>
                  <Button onClick={handleCompareWithPayslip} disabled={!actualPayslipAmount}>
                    Comparar
                  </Button>
                </div>
                
                {comparisonResult && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-4">Resultado da Comparação</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Calculado</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(comparisonResult.calculated)}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Recibo Real</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(comparisonResult.actual)}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Diferença</p>
                        <p className={`text-lg font-semibold ${
                          comparisonResult.difference > 0 ? 'text-green-600' : 
                          comparisonResult.difference < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {comparisonResult.difference > 0 ? '+' : ''}
                          {formatCurrency(Math.abs(comparisonResult.difference))}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {comparisonResult.difference === 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                      <span className="text-sm">
                        {comparisonResult.difference === 0 
                          ? 'Valores coincidem perfeitamente!' 
                          : `Diferença de ${Math.abs(comparisonResult.percentage).toFixed(1)}%`
                        }
                      </span>
                    </div>
                    
                    {Math.abs(comparisonResult.percentage) > 5 && (
                      <Alert className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          A diferença é significativa (&gt;{Math.abs(comparisonResult.percentage).toFixed(1)}%). 
                          Verifique se todas as entradas de tempo, políticas e configurações estão corretas.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}