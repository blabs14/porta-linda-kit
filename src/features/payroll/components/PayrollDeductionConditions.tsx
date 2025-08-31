import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Calculator, Info, ArrowLeft, HelpCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { deductionInferenceService } from '../services/deductionInferenceService';
import { PayrollDeductionConditionsFormData } from '../types';

// Schema de validação
const conditionsSchema = z.object({
  year: z.number().min(2024).max(2030),
  region: z.enum(['continente', 'acores', 'madeira']),
  marital_status: z.enum(['single', 'married', 'unido_de_facto']),
  taxation_mode: z.enum(['conjunta', 'separada']).optional(),
  income_holders: z.enum(['one', 'two']),
  dependents: z.number().min(0).max(20),
  disability_worker: z.boolean(),
  disability_dependents: z.boolean(),
  residency: z.enum(['resident', 'non_resident']),
  overtime_rule: z.enum(['half_effective_rate', 'none']),
  duodecimos: z.boolean(),
  meal_method: z.enum(['cash', 'card']),
  has_adse: z.boolean(),
  adse_rate: z.number().min(0).max(10),
  union_rate: z.number().min(0).max(5)
}).refine((data) => {
  // Validação: taxation_mode deve ser definido para married/unido_de_facto
  if (data.marital_status === 'married' || data.marital_status === 'unido_de_facto') {
    return data.taxation_mode !== undefined;
  }
  // Para single, taxation_mode deve ser undefined
  return data.taxation_mode === undefined;
}, {
  message: "Modo de tributação é obrigatório para casados e união de facto",
  path: ["taxation_mode"]
});

interface PayrollDeductionConditionsProps {
  contractId: string;
  onBack: () => void;
  onConditionsUpdated: (irsRate: number, ssRate: number) => void;
}

interface InferenceResult {
  ss_worker_rate: number;
  irs_effective_rate: number;
  base_irs_estimate: number;
  meal_limits: {
    cashPerDay: number;
    cardPerDay: number;
  };
  warnings: string[];
}

export function PayrollDeductionConditions({ 
  contractId, 
  onBack, 
  onConditionsUpdated 
}: PayrollDeductionConditionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);

  const form = useForm<PayrollDeductionConditionsFormData>({
    resolver: zodResolver(conditionsSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      region: 'continente',
      marital_status: 'single',
      income_holders: 'one',
      dependents: 0,
      disability_worker: false,
      disability_dependents: false,
      residency: 'resident',
      overtime_rule: 'half_effective_rate',
      duodecimos: false,
      meal_method: 'card',
      has_adse: false,
      adse_rate: 0,
      union_rate: 0
    }
  });

  // Carregar condições existentes
  useEffect(() => {
    const loadConditions = async () => {
      if (!user?.id || !contractId) return;
      
      setIsLoading(true);
      try {
        const conditions = await deductionInferenceService.getDeductionConditions(user.id, contractId);
        if (conditions) {
          form.reset({
            year: conditions.year,
            region: conditions.region,
            marital_status: conditions.marital_status,
            taxation_mode: conditions.taxation_mode,
            income_holders: conditions.income_holders,
            dependents: conditions.dependents,
            disability_worker: conditions.disability_worker,
            disability_dependents: conditions.disability_dependents,
            residency: conditions.residency,
            overtime_rule: conditions.overtime_rule,
            duodecimos: conditions.duodecimos,
            meal_method: conditions.meal_method,
            has_adse: conditions.has_adse,
            adse_rate: conditions.adse_rate,
            union_rate: conditions.union_rate
          });
        }
      } catch (error) {
        console.error('Erro ao carregar condições:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as condições existentes.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadConditions();
  }, [user?.id, contractId, form, toast]);

  const handleSave = async (data: PayrollDeductionConditionsFormData) => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const conditionsData = {
        ...data,
        taxation_mode: data.taxation_mode || null
      };
      await deductionInferenceService.updateDeductionConditions(user.id, contractId, conditionsData);
      toast({
        title: 'Sucesso',
        description: 'Condições guardadas com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao guardar condições:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível guardar as condições.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculate = async () => {
    if (!user?.id) return;
    
    const formData = form.getValues();
    setIsCalculating(true);
    
    try {
      // Primeiro guardar as condições
      await deductionInferenceService.updateDeductionConditions(user.id, contractId, formData);
      
      // Depois calcular as percentagens
      const result = await deductionInferenceService.inferDeductionRates(user.id, contractId, 1000); // Base de €1000 para estimativa
      
      setInferenceResult({
        ss_worker_rate: result.ss_worker_rate,
        irs_effective_rate: result.irs_effective_rate,
        base_irs_estimate: result.base_irs_estimate,
        meal_limits: result.meal_limits,
        warnings: result.warnings
      });
      
      // Notificar o componente pai sobre as novas percentagens
      onConditionsUpdated(result.irs_effective_rate * 100, result.ss_worker_rate * 100);
      
      toast({
        title: 'Sucesso',
        description: 'Percentagens recalculadas com base nas condições.'
      });
    } catch (error) {
      console.error('Erro ao recalcular percentagens:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível recalcular as percentagens.',
        variant: 'destructive'
      });
    } finally {
      setIsCalculating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const { register, handleSubmit, control, formState: { errors }, watch } = form;
  const watchedValues = watch();

  return (
    <div className="space-y-6">
      {/* Header com botão de voltar */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Condições que Influenciam as Percentagens</h2>
          <p className="text-sm text-muted-foreground">
            Configure as condições pessoais e fiscais para cálculo automático de IRS e Segurança Social
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Condições */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Condições Fiscais e Pessoais</CardTitle>
              <CardDescription>
                Estas informações são utilizadas para calcular automaticamente as percentagens de IRS e Segurança Social.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Informações Básicas</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Ano Fiscal</Label>
                      <Input
                        id="year"
                        type="number"
                        min="2024"
                        max="2030"
                        {...register('year', { valueAsNumber: true })}
                        className={errors.year ? 'border-red-500' : ''}
                      />
                      {errors.year && (
                        <p className="text-sm text-red-500">{errors.year.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="region">Região</Label>
                      <Controller
                        name="region"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a região" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="continente">Continente</SelectItem>
                              <SelectItem value="acores">Açores</SelectItem>
                              <SelectItem value="madeira">Madeira</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Estado Civil e Dependentes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Estado Civil e Dependentes</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="marital_status">Estado Civil</Label>
                        {watch('marital_status') === 'unido_de_facto' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Unido de facto é equiparado a 'Casado' se optar por tributação conjunta; 
                                  caso contrário usa tabelas de solteiro.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <Controller
                        name="marital_status"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            // Reset taxation_mode quando muda para single
                            if (value === 'single') {
                              form.setValue('taxation_mode', undefined);
                            }
                          }} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o estado civil" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Solteiro(a)</SelectItem>
                              <SelectItem value="married">Casado(a)</SelectItem>
                              <SelectItem value="unido_de_facto">Unido de facto</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {/* Modo de Tributação - só aparece para married/unido_de_facto */}
                    {(watch('marital_status') === 'married' || watch('marital_status') === 'unido_de_facto') && (
                      <div className="space-y-2">
                        <Label htmlFor="taxation_mode">Modo de Tributação</Label>
                        <Controller
                          name="taxation_mode"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o modo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="conjunta">Tributação Conjunta</SelectItem>
                                <SelectItem value="separada">Tributação Separada</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="income_holders">Número de Titulares de Rendimentos</Label>
                      <Controller
                        name="income_holders"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="one">Um titular</SelectItem>
                              <SelectItem value="two">Dois titulares</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dependents">Número de Dependentes</Label>
                      <Input
                        id="dependents"
                        type="number"
                        min="0"
                        max="20"
                        {...register('dependents', { valueAsNumber: true })}
                        className={errors.dependents ? 'border-red-500' : ''}
                      />
                      {errors.dependents && (
                        <p className="text-sm text-red-500">{errors.dependents.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="residency">Residência Fiscal</Label>
                      <Controller
                        name="residency"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="resident">Residente</SelectItem>
                              <SelectItem value="non_resident">Não Residente</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Condições Especiais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Condições Especiais</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="disability_worker">Trabalhador com Deficiência</Label>
                        <Controller
                          name="disability_worker"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="disability_dependents">Dependentes com Deficiência</Label>
                        <Controller
                          name="disability_dependents"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="duodecimos">Duodécimos</Label>
                        <Controller
                          name="duodecimos"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="has_adse">ADSE</Label>
                        <Controller
                          name="has_adse"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="meal_method">Método do Subsídio de Alimentação</Label>
                        <Controller
                          name="meal_method"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Dinheiro</SelectItem>
                                <SelectItem value="card">Cartão</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="overtime_rule">Regra de Horas Extras</Label>
                        <Controller
                          name="overtime_rule"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="half_effective_rate">50% da Taxa Efetiva</SelectItem>
                                <SelectItem value="none">Sem Retenção Especial</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {watchedValues.has_adse && (
                        <div className="space-y-2">
                          <Label htmlFor="adse_rate">Taxa ADSE (%)</Label>
                          <Input
                            id="adse_rate"
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            {...register('adse_rate', { valueAsNumber: true })}
                            className={errors.adse_rate ? 'border-red-500' : ''}
                          />
                          {errors.adse_rate && (
                            <p className="text-sm text-red-500">{errors.adse_rate.message}</p>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="union_rate">Quota Sindical (%)</Label>
                        <Input
                          id="union_rate"
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          {...register('union_rate', { valueAsNumber: true })}
                          className={errors.union_rate ? 'border-red-500' : ''}
                        />
                        {errors.union_rate && (
                          <p className="text-sm text-red-500">{errors.union_rate.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-4 pt-4">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A guardar...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleRecalculate}
                    disabled={isCalculating}
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A calcular...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-4 w-4" />
                        Recalcular Percentagens
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Resumo Lateral */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo das Percentagens</CardTitle>
              <CardDescription>
                Percentagens calculadas com base nas condições configuradas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inferenceResult ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">IRS:</span>
                      <span className="text-lg font-bold text-green-600">
                        {(inferenceResult.irs_effective_rate * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Segurança Social:</span>
                      <span className="text-lg font-bold text-blue-600">
                        {(inferenceResult.ss_worker_rate * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Base IRS (estimativa):</span>
                      <span className="text-sm text-muted-foreground">
                        €{inferenceResult.base_irs_estimate.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Limites de Subsídio de Alimentação</h4>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Dinheiro/dia:</span>
                        <span>€{inferenceResult.meal_limits.cashPerDay.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cartão/dia:</span>
                        <span>€{inferenceResult.meal_limits.cardPerDay.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {inferenceResult.warnings.length > 0 && (
                    <>
                      <Separator />
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            {inferenceResult.warnings.map((warning, index) => (
                              <p key={index} className="text-xs">{warning}</p>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Clique em "Recalcular Percentagens" para ver o resumo
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Nota:</strong> As percentagens são calculadas com base na legislação portuguesa vigente e nas condições configuradas. Consulte sempre um contabilista para situações específicas.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}