import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Utensils, Info, Edit, Euro } from 'lucide-react';
import { PayrollMealAllowanceConfig } from '../types';
import { payrollService } from '../services/payrollService';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const MONTHS = [
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

interface PayrollMealAllowanceConfigProps {
  config: PayrollMealAllowanceConfig | null;
  onConfigChange: (config: PayrollMealAllowanceConfig | null) => void;
}

export function PayrollMealAllowanceConfig({ config, onConfigChange }: PayrollMealAllowanceConfigProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const contract = await payrollService.getActiveContract(user.id);
      const contractId = contract?.id || null;
      setActiveContractId(contractId);
      
      if (contractId) {
        const data = await payrollService.getMealAllowanceConfig(user.id, contractId);
        onConfigChange(data);
      } else {
        onConfigChange(null);
      }
    } catch (error) {
      console.error('Error loading meal allowance config:', error);
      // Se não existe configuração, não é erro
      onConfigChange(null);
    } finally {
      setLoading(false);
    }
  };

  // Função para calcular o valor mensal estimado
  const calculateMonthlyValue = () => {
    if (!config) return 0;
    
    const dailyAmount = config.daily_amount_cents / 100; // Converter de cents para euros
    const workingDaysPerMonth = 22; // Estimativa padrão de dias úteis por mês
    
    return dailyAmount * workingDaysPerMonth;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando configurações...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Configuração do Subsídio de Alimentação
            </CardTitle>
            <CardDescription>
              Configure os meses em que o subsídio de alimentação não deve ser pago.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/personal/payroll/config')}
          >
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {config ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Valor Diário</span>
                  </div>
                  <p className="text-2xl font-bold">
                    €{(config.daily_amount_cents / 100).toFixed(2)}
                  </p>
                </div>
                
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Euro className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Valor Mensal Estimado</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    €{calculateMonthlyValue().toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Baseado em 22 dias úteis por mês
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p><strong>Regras do subsídio de alimentação:</strong></p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Pago apenas em dias trabalhados</li>
                        <li>Não pago em férias ou feriados</li>
                        <li>Calculado automaticamente</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
            
            {config.excluded_months && config.excluded_months.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Meses excluídos do pagamento:</h4>
                <div className="flex flex-wrap gap-2">
                  {config.excluded_months.map(monthValue => {
                    const month = MONTHS.find(m => m.value === monthValue);
                    return (
                      <Badge key={monthValue} variant="secondary">
                        {month?.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Subsídio de Alimentação não configurado</h3>
            <p className="text-muted-foreground mb-4">
              Configure o subsídio de alimentação na página de configurações.
            </p>
            <Button onClick={() => navigate('/personal/payroll/config')}>
              <Edit className="mr-2 h-4 w-4" />
              Configurar Agora
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}