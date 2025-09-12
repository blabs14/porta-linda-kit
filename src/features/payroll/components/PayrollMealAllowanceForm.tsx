import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Info, Euro } from 'lucide-react';
import { PayrollMealAllowanceConfig, PayrollMealAllowanceConfigFormData, MealAllowancePaymentMethod } from '../types';
import { payrollService } from '../services/payrollService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/shared/lib/logger';
import { isValidUUID } from '@/lib/validation';

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

const PAYMENT_METHODS = [
  { value: 'card' as MealAllowancePaymentMethod, label: 'Cartão/Vale Refeição', limit: 10.20 },
  { value: 'cash' as MealAllowancePaymentMethod, label: 'Dinheiro', limit: 6.00 }
];

// Schema de validação
const mealAllowanceSchema = z.object({
  dailyAmount: z.number()
    .min(0.01, 'O valor diário deve ser superior a 0')
    .max(50, 'O valor diário não pode exceder €50'),
  excluded_months: z.array(z.number()).default([]),
  paymentMethod: z.enum(['cash', 'card']).default('card'),
  duodecimosEnabled: z.boolean().default(false)
});

type FormData = z.infer<typeof mealAllowanceSchema>;

interface PayrollMealAllowanceFormProps {
  config?: PayrollMealAllowanceConfig | null;
  contractId?: string;
  onSave?: (config: PayrollMealAllowanceConfig) => void;
  onCancel?: () => void;
}

export function PayrollMealAllowanceForm({ contractId, config, onSave, onCancel }: PayrollMealAllowanceFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(config?.excluded_months || []);

  // Debug logs
  useEffect(() => {
    logger.debug('PayrollMealAllowanceForm mounted');
    logger.debug('contractId:', contractId);
    logger.debug('user:', user);
    logger.debug('config:', config);
  }, [contractId, user, config]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<FormData>({
    resolver: zodResolver(mealAllowanceSchema),
    defaultValues: {
      dailyAmount: config ? config.daily_amount_cents / 100 : 0,
      excluded_months: config?.excluded_months || [],
      paymentMethod: config?.payment_method || 'card',
      duodecimosEnabled: config?.duodecimos_enabled || false
    }
  });

  const watchedPaymentMethod = watch('paymentMethod');
  const watchedDailyAmount = watch('dailyAmount');

  // Atualizar meses excluídos quando mudarem
  useEffect(() => {
    setValue('excluded_months', selectedMonths);
  }, [selectedMonths, setValue]);

  // Obter limite de isenção fiscal baseado no método de pagamento
  const getTaxExemptionLimit = (method: MealAllowancePaymentMethod): number => {
    return PAYMENT_METHODS.find(pm => pm.value === method)?.limit || 0;
  };

  // Verificar se o valor excede o limite de isenção
  const exceedsTaxLimit = watchedDailyAmount > getTaxExemptionLimit(watchedPaymentMethod);

  // Calcular valor mensal estimado
  const calculateMonthlyEstimate = (): number => {
    const workingDaysPerMonth = 22; // Estimativa padrão
    return watchedDailyAmount * workingDaysPerMonth;
  };

  // Manipular seleção de meses
  const handleMonthToggle = (monthValue: number) => {
    setSelectedMonths(prev => {
      if (prev.includes(monthValue)) {
        return prev.filter(m => m !== monthValue);
      } else {
        return [...prev, monthValue].sort((a, b) => a - b);
      }
    });
  };

  // Submeter formulário
  const onSubmit = async (data: FormData) => {
    logger.debug('PayrollMealAllowanceForm - onSubmit called with data:', data);
    logger.debug('PayrollMealAllowanceForm - contractId:', contractId);
    logger.debug('PayrollMealAllowanceForm - user:', user?.id);
    
    if (!user?.id) {
      logger.warn('PayrollMealAllowanceForm - User not authenticated');
      toast({
        title: 'Erro',
        description: 'Utilizador não autenticado',
        variant: 'destructive'
      });
      return;
    }

    if (!contractId) {
      logger.warn('PayrollMealAllowanceForm - Contract ID not provided');
      toast({
        title: 'Erro',
        description: 'ID do contrato não fornecido',
        variant: 'destructive'
      });
      return;
    }

    // Validar se o contractId é um UUID válido
    if (!isValidUUID(contractId)) {
      logger.warn('PayrollMealAllowanceForm - Invalid contract ID format');
      toast({
        title: 'Erro',
        description: 'ID do contrato deve ser um UUID válido. Por favor, selecione um contrato válido.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
        const formData: PayrollMealAllowanceConfigFormData = {
          dailyAmount: data.dailyAmount,
          excluded_months: selectedMonths,
          paymentMethod: data.paymentMethod,
          duodecimosEnabled: data.duodecimosEnabled
        };

        logger.debug('PayrollMealAllowanceForm - Calling upsertMealAllowanceConfig with:', {
          userId: user.id,
          contractId,
          formData
        });
        
        const savedConfig = await payrollService.upsertMealAllowanceConfig(user.id, contractId, formData);
        
        logger.debug('PayrollMealAllowanceForm - upsertMealAllowanceConfig result:', savedConfig);
        
        toast({
          title: 'Sucesso',
          description: 'Configuração do subsídio de alimentação guardada com sucesso!'
        });

        onSave?.(savedConfig);
      } catch (error: any) {
        logger.error('PayrollMealAllowanceForm - Error saving config:', error);
        toast({
          title: 'Erro',
          description: error.message || 'Erro ao salvar configuração do subsídio de alimentação',
          variant: 'destructive'
        });
      } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Configuração do Subsídio de Alimentação
        </CardTitle>
        <CardDescription>
          Configure o valor diário, método de pagamento e meses de exclusão do subsídio de alimentação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Valor Diário */}
          <div className="space-y-2">
            <Label htmlFor="dailyAmount">Valor Diário (€)</Label>
            <Input
              id="dailyAmount"
              type="number"
              step="0.01"
              min="0"
              max="50"
              placeholder="Ex: 7.50"
              {...register('dailyAmount', { valueAsNumber: true })}
            />
            {errors.dailyAmount && (
              <p className="text-sm text-red-600">{errors.dailyAmount.message}</p>
            )}
            {watchedDailyAmount > 0 && (
              <p className="text-sm text-gray-600">
                Valor mensal estimado: €{calculateMonthlyEstimate().toFixed(2)}
              </p>
            )}
          </div>

          {/* Método de Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pagamento</Label>
            <Select
              value={watchedPaymentMethod}
              onValueChange={(value: MealAllowancePaymentMethod) => setValue('paymentMethod', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label} (Limite: €{method.limit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {exceedsTaxLimit && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  O valor diário de €{watchedDailyAmount.toFixed(2)} excede o limite de isenção fiscal de €{getTaxExemptionLimit(watchedPaymentMethod).toFixed(2)} para {watchedPaymentMethod === 'cash' ? 'pagamento em dinheiro' : 'cartão/vale refeição'}.
                  O excesso estará sujeito a tributação.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Duodécimos */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="duodecimosEnabled"
              checked={watch('duodecimosEnabled')}
              onCheckedChange={(checked) => setValue('duodecimosEnabled', !!checked)}
            />
            <Label htmlFor="duodecimosEnabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Pagamento em duodécimos (distribuição anual em 12 meses)
            </Label>
          </div>

          {/* Meses Excluídos */}
          <div className="space-y-3">
            <Label>Meses Excluídos do Pagamento</Label>
            <p className="text-sm text-gray-600">
              Selecione os meses em que o subsídio de alimentação não deve ser pago (ex: férias, licenças).
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((month) => (
                <div key={month.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`month-${month.value}`}
                    checked={selectedMonths.includes(month.value)}
                    onCheckedChange={() => handleMonthToggle(month.value)}
                  />
                  <Label htmlFor={`month-${month.value}`} className="text-sm">
                    {month.label}
                  </Label>
                </div>
              ))}
            </div>
            {selectedMonths.length > 0 && (
              <p className="text-sm text-gray-600">
                Meses excluídos: {selectedMonths.map(m => MONTHS.find(month => month.value === m)?.label).join(', ')}
              </p>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={loading || !isValid}

            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {config ? 'Atualizar' : 'Guardar'} Configuração
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default PayrollMealAllowanceForm;