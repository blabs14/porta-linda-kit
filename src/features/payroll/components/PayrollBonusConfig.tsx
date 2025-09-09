import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { payrollService } from '../services/payrollService';
import { useActiveContract } from '../hooks/useActiveContract';
import { logger } from '@/shared/lib/logger';

type BonusType = 'mandatory' | 'performance' | 'custom';
type SpecificSubsidy = 'vacation' | 'christmas' | 'both';

interface PayrollBonusConfigProps {
  bonusType: BonusType;
  specificSubsidy?: SpecificSubsidy;
  onSave?: (data: any) => void;
}

interface EmployeeSalaryData {
  baseSalary: number;
  weeklyHours: number;
}

// Esquemas de validacao

const mandatoryBonusSchema = z.object({
  vacationBonus: z.boolean().default(true),
  christmasBonus: z.boolean().default(true),
  paymentMonth: z.string(),
  autoCalculate: z.boolean().default(true),
  paymentType: z.enum(['full', 'proportional', 'duodecimos']).default('full')
});

const performanceBonusSchema = z.object({
  enabled: z.boolean().default(false),
  percentage: z.number().min(0).max(100, 'Percentagem nao pode exceder 100%'),
  maxAmount: z.number().min(0, 'Valor maximo deve ser positivo'),
  paymentFrequency: z.enum(['monthly', 'quarterly', 'annually']),
  requiresEvaluation: z.boolean().default(false),
  taxExempt: z.boolean().default(false)
});

const customBonusSchema = z.object({
  name: z.string().min(1, 'Nome do premio e obrigatorio'),
  description: z.string().optional(),
  enabled: z.boolean().default(false),
  isPercentage: z.boolean().default(false),
  amount: z.number().min(0, 'Valor deve ser positivo'),
  paymentFrequency: z.enum(['monthly', 'quarterly', 'annually']),
  taxable: z.boolean().default(true),
  requiresApproval: z.boolean().default(false)
});

// Funcao auxiliar para calcular bonus obrigatorios
function calculateMandatoryBonus(salaryData: EmployeeSalaryData, bonusType: 'vacation' | 'christmas'): number {
  if (!salaryData.baseSalary) return 0;
  
  // Subsidios obrigatorios sao equivalentes a um mes de salario
  return salaryData.baseSalary;
}

// Função para gerar alertas informativos sobre opções legais
function generateLegalAlerts(formData: any, specificSubsidy: SpecificSubsidy): string[] {
  const alerts: string[] = [];
  
  // Alertas para subsídio de férias
  if ((specificSubsidy === 'vacation' || specificSubsidy === 'both') && formData.vacationBonus) {
    if (formData.paymentType === 'duodecimos') {
      alerts.push('💡 Pagamento em duodécimos: Pode pagar metade do valor total mediante acordo com o trabalhador.');
    }
    
    if (formData.paymentType === 'proportional') {
      alerts.push('💡 Pagamento proporcional: Aplicável em caso de gozo interpolado das férias.');
    }
    

    

  }
  
  // Alertas para subsídio de Natal
  if ((specificSubsidy === 'christmas' || specificSubsidy === 'both') && formData.christmasBonus) {
    if (formData.paymentMonth !== 'december') {
      alerts.push('💡 Subsídio de Natal: Tradicionalmente pago até 15 de dezembro.');
    }
  }
  
  return alerts;
}

export function PayrollBonusConfig({ bonusType, specificSubsidy = 'both', onSave }: PayrollBonusConfigProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeContract } = useActiveContract();
  const [salaryData, setSalaryData] = useState<EmployeeSalaryData>({ baseSalary: 0, weeklyHours: 40 });
  const [calculatedAmount, setCalculatedAmount] = useState(0);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  
  const isMandatory = bonusType === 'mandatory';
  const isPerformance = bonusType === 'performance';
  const isCustom = bonusType === 'custom';
  
  // Debug logs
  logger.debug('PayrollBonusConfig Debug:', {
    bonusType,
    isMandatory,
    isPerformance,
    isCustom,
    contractId: activeContract?.id,
    specificSubsidy
  });

  // Efeito para carregar configuração existente
  useEffect(() => {
    if (!activeContract?.id || !bonusType) return;

    const loadBonusConfig = async () => {
      try {
        if (!user?.id || !activeContract?.id) return;
        
        const config = await payrollService.getBonusConfig(user.id, activeContract.id, bonusType);
        logger.debug('Loading bonus config for:', { userId: user.id, contractId: activeContract.id, bonusType, config });
        
        if (config && config.config_data) {
          if (isMandatory) {
            mandatoryForm.reset(config.config_data);
          } else if (isPerformance) {
            performanceForm.reset(config.config_data);
          } else if (isCustom) {
            customForm.reset(config.config_data);
          }
        }
      } catch (error) {
        logger.error('Erro ao carregar configuração de bónus:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a configuração existente.',
          variant: 'destructive'
        });
      }
    };

    loadBonusConfig();
  }, [activeContract?.id, bonusType, user?.id, toast]);



  // Configuracao dos formularios
  const mandatoryForm = useForm({
    resolver: zodResolver(mandatoryBonusSchema),
    defaultValues: {
      vacationBonus: true,
      christmasBonus: true,
      paymentMonth: '',
      autoCalculate: true,
      paymentType: 'full'
    }
  });

  const performanceForm = useForm({
    resolver: zodResolver(performanceBonusSchema),
    defaultValues: {
      enabled: false,
      percentage: 5,
      maxAmount: 5000,
      paymentFrequency: 'annually' as const,
      requiresEvaluation: false,
      taxExempt: false
    }
  });

  const customForm = useForm({
    resolver: zodResolver(customBonusSchema),
    defaultValues: {
      name: '',
      description: '',
      enabled: false,
      isPercentage: false,
      amount: 0,
      paymentFrequency: 'monthly' as const,
      taxable: true,
      requiresApproval: false
    }
  });

  // useEffect para calcular valores automaticamente
  useEffect(() => {
    if (isMandatory) {
      const vacationAmount = mandatoryForm.watch('vacationBonus') ? calculateMandatoryBonus(salaryData, 'vacation') : 0;
      const christmasAmount = mandatoryForm.watch('christmasBonus') ? calculateMandatoryBonus(salaryData, 'christmas') : 0;
      setCalculatedAmount(vacationAmount + christmasAmount);
    }
  }, [mandatoryForm.watch(), salaryData, isMandatory]);

  useEffect(() => {
    if (isPerformance && performanceForm.watch('enabled')) {
      const percentage = performanceForm.watch('percentage') || 0;
      const maxAmount = performanceForm.watch('maxAmount') || 0;
      const calculated = (salaryData.baseSalary * percentage) / 100;
      setCalculatedAmount(Math.min(calculated, maxAmount));
    } else if (isPerformance) {
      setCalculatedAmount(0);
    }
  }, [performanceForm.watch(), salaryData, isPerformance]);

  useEffect(() => {
    if (isCustom && customForm.watch('enabled')) {
      const amount = customForm.watch('amount') || 0;
      const isPercentage = customForm.watch('isPercentage');
      
      if (isPercentage) {
        setCalculatedAmount((salaryData.baseSalary * amount) / 100);
      } else {
        setCalculatedAmount(amount);
      }
    } else if (isCustom) {
      setCalculatedAmount(0);
    }
  }, [customForm.watch(), salaryData, isCustom]);

  // useEffect para atualizar alertas informativos
  useEffect(() => {
    if (isMandatory) {
      const formData = mandatoryForm.getValues();
      const alerts = generateLegalAlerts(formData, specificSubsidy);
      setValidationWarnings(alerts);
    }
  }, [mandatoryForm.watch(), specificSubsidy, isMandatory]);

  // useEffect para carregar dados salariais do contrato
  useEffect(() => {
    if (!activeContract?.id || !user?.id) return;

    const loadSalaryData = async () => {
      try {
        logger.debug('Loading salary data for contract:', activeContract.id);
        const contractData = await payrollService.getContract(user.id, activeContract.id);
        
        if (contractData) {
          // Converter de cêntimos para euros
          const baseSalaryEuros = contractData.monthly_salary_cents ? contractData.monthly_salary_cents / 100 : 0;
          
          setSalaryData({
            baseSalary: baseSalaryEuros,
            weeklyHours: contractData.weekly_hours || 40
          });
        } else {
          // Fallback para valores padrão se não encontrar o contrato
          setSalaryData({
            baseSalary: 0,
            weeklyHours: 40
          });
        }
      } catch (error) {
        logger.error('Erro ao carregar dados salariais:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados salariais.',
          variant: 'destructive'
        });
        // Fallback para valores padrão em caso de erro
        setSalaryData({
          baseSalary: 0,
          weeklyHours: 40
        });
      }
    };

    loadSalaryData();
  }, [activeContract?.id, user?.id, toast]);

  // Handlers para submissao dos formularios
  const onMandatorySubmit = async (data: z.infer<typeof mandatoryBonusSchema>) => {
    if (!activeContract?.id) {
      toast({
        title: 'Erro',
        description: 'ID do contrato não encontrado.',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (!user?.id) {
        toast({
          title: 'Erro',
          description: 'Utilizador não autenticado.',
          variant: 'destructive'
        });
        return;
      }
      
      await payrollService.upsertBonusConfig(user.id, activeContract.id, 'mandatory', data);
       logger.debug('Guardando configuração de subsídios obrigatórios:', { userId: user.id, contractId: activeContract.id, data });
      toast({
        title: 'Configuracao guardada',
        description: 'As configuracoes de bonus obrigatorios foram guardadas com sucesso.'
      });
      onSave?.(data);
    } catch (error) {
      logger.error('Erro ao guardar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível guardar a configuração.',
        variant: 'destructive'
      });
    }
  };

  const onPerformanceSubmit = async (data: z.infer<typeof performanceBonusSchema>) => {
    if (!activeContract?.id) {
      toast({
        title: 'Erro',
        description: 'ID do contrato não encontrado.',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (!user?.id) {
        toast({
          title: 'Erro',
          description: 'Utilizador não autenticado.',
          variant: 'destructive'
        });
        return;
      }
      
      await payrollService.upsertBonusConfig(user.id, activeContract.id, 'performance', data);
       logger.debug('Guardando configuração de prémios de produtividade:', { userId: user.id, contractId: activeContract.id, data });
      toast({
        title: 'Configuracao guardada',
        description: 'As configuracoes de premios de produtividade foram guardadas com sucesso.'
      });
      onSave?.(data);
    } catch (error) {
      logger.error('Erro ao guardar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível guardar a configuração.',
        variant: 'destructive'
      });
    }
  };

  const onCustomSubmit = async (data: z.infer<typeof customBonusSchema>) => {
    if (!activeContract?.id) {
      toast({
        title: 'Erro',
        description: 'ID do contrato não encontrado.',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (!user?.id) {
        toast({
          title: 'Erro',
          description: 'Utilizador não autenticado.',
          variant: 'destructive'
        });
        return;
      }
      
      await payrollService.upsertBonusConfig(user.id, activeContract.id, 'custom', data);
       logger.debug('Guardando configuração de prémio personalizado:', { userId: user.id, contractId: activeContract.id, data });
      toast({
        title: 'Premio guardado',
        description: 'O premio personalizado foi guardado com sucesso.'
      });
      onSave?.(data);
    } catch (error) {
      logger.error('Erro ao guardar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível guardar a configuração.',
        variant: 'destructive'
      });
    }
  };

  // Funcao para obter informacoes do bonus
  const getBonusInfo = (type: BonusType, specificSubsidy?: SpecificSubsidy) => {
    switch (type) {
      case 'mandatory':
        if (specificSubsidy === 'vacation') {
          return {
            title: 'Subsidio de Ferias',
            description: 'Configure o subsidio de ferias.',
            legalInfo: 'Subsidio equivalente a um mes de retribuicao',
            paymentDeadline: 'Pagamento conforme definido pela empresa'
          };
        } else if (specificSubsidy === 'christmas') {
          return {
            title: 'Subsidio de Natal',
            description: 'Configure o subsidio de Natal.',
            legalInfo: 'Subsidio equivalente a um mes de retribuicao',
            paymentDeadline: 'Pagamento conforme definido pela empresa'
          };
        } else {
          return {
            title: 'Subsidios Obrigatorios',
            description: 'Configure os subsidios de ferias e Natal.',
            legalInfo: 'Subsidios equivalentes a um mes de retribuicao',
            paymentDeadline: 'Pagamento conforme definido pela empresa'
          };
        }
      case 'performance':
        return {
          title: 'Premios de Produtividade',
          description: 'Configure premios baseados em objetivos e desempenho.',
          legalInfo: 'Premios sujeitos a tributacao conforme legislacao aplicavel',
          paymentDeadline: 'Definido pela empresa'
        };
      case 'custom':
        return {
          title: 'Premios Personalizados',
          description: 'Crie premios especificos para situacoes particulares.',
          legalInfo: 'Sujeitos a tributacao conforme legislacao aplicavel',
          paymentDeadline: 'Definido pela empresa conforme politica interna'
        };
      default:
        return {
          title: 'Configuracao de Bonus',
          description: 'Configure os bonus e premios.',
          legalInfo: '',
          paymentDeadline: ''
        };
    }
  };

  const bonusInfo = getBonusInfo(bonusType, specificSubsidy);

  // Renderizacao para bonus obrigatorios
  if (isMandatory) {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Informacao Legal:</strong> {bonusInfo.legalInfo}
            <br />
            <strong>Prazo de Pagamento:</strong> {bonusInfo.paymentDeadline}
          </AlertDescription>
        </Alert>

        <Form {...mandatoryForm}>
          <form onSubmit={mandatoryForm.handleSubmit(onMandatorySubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subsidios Obrigatorios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {(specificSubsidy === 'vacation' || specificSubsidy === 'both') && (
                    <FormField
                      control={mandatoryForm.control}
                      name="vacationBonus"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Subsidio de Ferias
                            </FormLabel>
                            <FormDescription>
                              Subsidio obrigatorio equivalente a um mes de salario
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  {(specificSubsidy === 'christmas' || specificSubsidy === 'both') && (
                    <FormField
                      control={mandatoryForm.control}
                      name="christmasBonus"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Subsidio de Natal
                            </FormLabel>
                            <FormDescription>
                              Subsidio obrigatorio equivalente a um mes de salario
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Campo de seleção de mês apenas para subsídio de férias */}
                {specificSubsidy !== 'christmas' && (
                  <FormField
                    control={mandatoryForm.control}
                    name="paymentMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mes de Pagamento Preferencial</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o mês" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="january">Janeiro</SelectItem>
                            <SelectItem value="february">Fevereiro</SelectItem>
                            <SelectItem value="march">Março</SelectItem>
                            <SelectItem value="april">Abril</SelectItem>
                            <SelectItem value="may">Maio</SelectItem>
                            <SelectItem value="june">Junho</SelectItem>
                            <SelectItem value="july">Julho</SelectItem>
                            <SelectItem value="august">Agosto</SelectItem>
                            <SelectItem value="september">Setembro</SelectItem>
                            <SelectItem value="october">Outubro</SelectItem>
                            <SelectItem value="november">Novembro</SelectItem>
                            <SelectItem value="december">Dezembro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {specificSubsidy === 'vacation' && 'O subsídio de férias pode ser pago em qualquer mês do ano'}
                          {specificSubsidy === 'both' && 'O subsídio de férias pode ser pago em qualquer mês do ano'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Informação fixa para subsídio de Natal */}
                {specificSubsidy === 'christmas' && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">Mês de Pagamento</h4>
                    <p className="text-blue-700">Dezembro (fixo por lei)</p>
                    <p className="text-sm text-blue-600 mt-1">
                      O subsídio de Natal deve ser pago sempre em dezembro
                    </p>
                  </div>
                )}

                <FormField
                  control={mandatoryForm.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Pagamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full">Pagamento Integral</SelectItem>
                          <SelectItem value="proportional">Pagamento Proporcional</SelectItem>
                          <SelectItem value="duodecimos">Duodécimos (50% antecipado)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Escolha como o subsídio será pago
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />





                <FormField
                  control={mandatoryForm.control}
                  name="autoCalculate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Calculo Automatico
                        </FormLabel>
                        <FormDescription>
                          Calcular automaticamente com base no salario base
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Informações sobre o contrato carregado */}
                {activeContract?.id && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Contrato:</strong> {activeContract.id}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Salário Base:</strong> {formatCurrency(salaryData.baseSalary)}
                    </p>
                  </div>
                )}

                {calculatedAmount > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">Valor Total Calculado</h4>
                    <p className="text-2xl font-bold text-blue-700">
                      {formatCurrency(calculatedAmount)}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      Baseado no salario base atual
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full">
              Guardar Configuracao
            </Button>
          </form>
        </Form>
      </div>
    );
  }

  // Renderizacao para premios de produtividade
  if (isPerformance) {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Informacao Legal:</strong> {bonusInfo.legalInfo}
            <br />
            <strong>Prazo de Pagamento:</strong> {bonusInfo.paymentDeadline}
          </AlertDescription>
        </Alert>

        <Form {...performanceForm}>
          <form onSubmit={performanceForm.handleSubmit(onPerformanceSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Premios de Produtividade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={performanceForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Ativar Premios de Produtividade
                        </FormLabel>
                        <FormDescription>
                          Permitir atribuicao de premios baseados em desempenho
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {performanceForm.watch('enabled') && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={performanceForm.control}
                        name="percentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Percentagem do Salario Base (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="5.0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={performanceForm.control}
                        name="maxAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Maximo (€)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="5000.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={performanceForm.control}
                      name="paymentFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequencia de Pagamento</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a frequencia" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Mensal</SelectItem>
                              <SelectItem value="quarterly">Trimestral</SelectItem>
                              <SelectItem value="annually">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={performanceForm.control}
                        name="requiresEvaluation"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Requer Avaliacao de Desempenho
                              </FormLabel>
                              <FormDescription>
                                Exigir avaliacao previa para atribuicao
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={performanceForm.control}
                        name="taxExempt"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Isencao Fiscal
                              </FormLabel>
                              <FormDescription>
                                Aplicar isencao de IRS e Seguranca Social
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {calculatedAmount > 0 && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900">Valor Maximo Calculado</h4>
                        <p className="text-2xl font-bold text-green-700">
                          {formatCurrency(calculatedAmount)}
                        </p>
                        {performanceForm.watch('paymentFrequency') !== 'annually' && (
                          <p className="text-sm text-green-600 mt-1">
                            <strong>Valor por periodo:</strong>{' '}
                            {formatCurrency(
                              calculatedAmount / (performanceForm.watch('paymentFrequency') === 'monthly' ? 12 : 4)
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    {validationWarnings.length > 0 && (
                      <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                          <div>
                            <h4 className="font-medium text-yellow-800">Avisos</h4>
                            <ul className="mt-1 text-sm text-yellow-700">
                              {validationWarnings.map((warning, index) => (
                                <li key={`warning-${warning.replace(/\s+/g, '-').toLowerCase().slice(0, 20)}-${index}`}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full">
              Guardar Configuracao
            </Button>
          </form>
        </Form>
      </div>
    );
  }

  // Renderizacao para premios personalizados
  if (isCustom) {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Informacao Legal:</strong> {bonusInfo.legalInfo}
            <br />
            <strong>Prazo de Pagamento:</strong> {bonusInfo.paymentDeadline}
          </AlertDescription>
        </Alert>

        <Form {...customForm}>
          <form onSubmit={customForm.handleSubmit(onCustomSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={customForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Premio</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Premio de Assiduidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={customForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descricao</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descricao detalhada do premio e criterios de atribuicao"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={customForm.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Ativar Premio
                    </FormLabel>
                    <FormDescription>
                      Permitir atribuicao deste premio personalizado
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {customForm.watch('enabled') && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Configuracao do Valor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={customForm.control}
                      name="isPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Valor</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => field.onChange(value === 'percentage')}
                              value={field.value ? 'percentage' : 'fixed'}
                              className="flex flex-col space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="fixed" id="fixed" />
                                <Label htmlFor="fixed">Valor Fixo (€)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="percentage" id="percentage" />
                                <Label htmlFor="percentage">Percentagem do Salario Base (%)</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {customForm.watch('isPercentage') ? 'Percentagem (%)' : 'Valor (€)'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step={customForm.watch('isPercentage') ? '0.1' : '0.01'}
                              placeholder={customForm.watch('isPercentage') ? '5.0' : '500.00'}
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customForm.control}
                      name="paymentFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequencia de Pagamento</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a frequencia" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Mensal</SelectItem>
                              <SelectItem value="quarterly">Trimestral</SelectItem>
                              <SelectItem value="annually">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={customForm.control}
                        name="taxable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Sujeito a Tributacao
                              </FormLabel>
                              <FormDescription>
                                Aplicar IRS e Seguranca Social
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={customForm.control}
                        name="requiresApproval"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Requer Aprovacao
                              </FormLabel>
                              <FormDescription>
                                Exigir aprovacao previa para atribuicao
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {calculatedAmount > 0 && (
                      <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-900">Valor Calculado</h4>
                        <p className="text-2xl font-bold text-purple-700">
                          {formatCurrency(calculatedAmount)}
                        </p>
                        {customForm.watch('paymentFrequency') !== 'annually' && (
                          <p className="text-sm text-purple-600 mt-1">
                            <strong>Valor por periodo:</strong>{' '}
                            {formatCurrency(
                              calculatedAmount / (customForm.watch('paymentFrequency') === 'monthly' ? 12 : 4)
                            )}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {customForm.watch('taxable') && calculatedAmount > 0 && (
                      <div className="mt-2 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Tributacao:</strong> Sujeito a IRS e Seguranca Social
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {customForm.watch('requiresApproval') && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Atencao:</strong> Este premio requer aprovacao previa
                    </p>
                  </div>
                )}

                {/* Informações sobre o contrato carregado */}
                {activeContract?.id && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Contrato:</strong> {activeContract.id}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Salário Base:</strong> {formatCurrency(salaryData.baseSalary)}
                    </p>
                  </div>
                )}
              </>
            )}

            <Button type="submit" className="w-full">
              Guardar Premio Personalizado
            </Button>
          </form>
        </Form>
      </div>
    );
  }

  return null;
}

export default PayrollBonusConfig;