import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Utensils, Save, Info } from 'lucide-react';
import { PayrollMealAllowanceConfig, PayrollMealAllowanceConfigFormData } from '../types';
import { payrollService } from '../services/payrollService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [excludedMonths, setExcludedMonths] = useState<number[]>([]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await payrollService.getMealAllowanceConfig(user.id);
      onConfigChange(data);
      setExcludedMonths(data?.excluded_months || []);
    } catch (error) {
      console.error('Error loading meal allowance config:', error);
      // Se não existe configuração, não é erro
      onConfigChange(null);
      setExcludedMonths([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const configData: PayrollMealAllowanceConfigFormData = {
        excluded_months: excludedMonths
      };
      
      let savedConfig: PayrollMealAllowanceConfig;
      
      if (config) {
        savedConfig = await payrollService.updateMealAllowanceConfig(config.id, configData);
      } else {
        savedConfig = await payrollService.createMealAllowanceConfig(user.id, configData);
      }
      
      onConfigChange(savedConfig);
      toast({
        title: 'Configuração salva',
        description: 'As configurações do subsídio de alimentação foram atualizadas com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações do subsídio de alimentação.',
        variant: 'destructive'
      });
      console.error('Error saving meal allowance config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleMonthToggle = (month: number, checked: boolean) => {
    if (checked) {
      setExcludedMonths(prev => [...prev, month].sort());
    } else {
      setExcludedMonths(prev => prev.filter(m => m !== month));
    }
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
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5" />
          Configuração do Subsídio de Alimentação
        </CardTitle>
        <CardDescription>
          Configure os meses em que o subsídio de alimentação não deve ser pago.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Regras do subsídio de alimentação:</strong></p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Pago apenas em dias trabalhados (não em férias ou feriados)</li>
                <li>Pode ser excluído de meses específicos (ex: mês de férias)</li>
                <li>Calculado automaticamente com base no contrato de trabalho</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Meses sem pagamento de subsídio</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione os meses em que o subsídio de alimentação não deve ser pago.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {MONTHS.map((month) => {
              const isExcluded = excludedMonths.includes(month.value);
              return (
                <div key={month.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`month-${month.value}`}
                    checked={isExcluded}
                    onCheckedChange={(checked) => handleMonthToggle(month.value, checked as boolean)}
                  />
                  <Label 
                    htmlFor={`month-${month.value}`} 
                    className="text-sm font-normal cursor-pointer"
                  >
                    {month.label}
                  </Label>
                </div>
              );
            })}
          </div>
          
          {excludedMonths.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Meses excluídos:</Label>
              <div className="flex flex-wrap gap-2">
                {excludedMonths.map(monthValue => {
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
        </div>
        
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}