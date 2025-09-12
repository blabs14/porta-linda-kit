'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { useAuth } from '@/contexts/AuthContext';
import { payrollService } from '@/features/payroll/services/payrollService';
import { Settings, Clock, Utensils, Calendar, FileText, Coffee, Car, Award, Percent, AlertCircle, Trash2, Users } from 'lucide-react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useActiveContract } from '@/features/payroll/hooks/useActiveContract';
import { PayrollContractForm } from '@/features/payroll/components/PayrollContractForm';
import { QuickContractForm } from '@/features/payroll/components/QuickContractForm';

import { PayrollDeductionConfig } from '@/features/payroll/components/PayrollDeductionConfig';
// PayrollHolidaysManager removido - sincronização automática implementada
import { PayrollVacationsManager } from '@/features/payroll/components/PayrollVacationsManager';
import { PayrollOTPolicyForm } from '@/features/payroll/components/PayrollOTPolicyForm';
import { PayrollMealAllowanceForm } from '@/features/payroll/components/PayrollMealAllowanceForm';
import { PayrollLeavesManager } from '@/features/payroll/components/PayrollLeavesManager';
import { PayrollMileagePolicyForm } from '@/features/payroll/components/PayrollMileagePolicyForm';
import { PayrollBonusConfig } from '@/features/payroll/components/PayrollBonusConfig';
import { CompensatoryRestManager } from '@/features/payroll/components/CompensatoryRestManager';
import { logger } from '@/shared/lib/logger';

// Validation schemas
const contractSchema = z.object({
  baseSalary: z.number().min(0.01, 'Salário base deve ser maior que 0'),
  currency: z.string().min(1, 'Moeda é obrigatória'),
  hoursPerWeek: z.number().min(1, 'Horas por semana deve ser maior que 0').max(60, 'Máximo 60 horas por semana'),
  standardWorkStart: z.string().min(1, 'Hora de início é obrigatória'),
  standardWorkEnd: z.string().min(1, 'Hora de fim é obrigatória'),
  standardBreakMinutes: z.number().min(0, 'Pausa não pode ser negativa'),
  useStandardSchedule: z.boolean()
});

const otPolicySchema = z.object({
  weeklyLimit: z.number().min(0, 'Limite semanal não pode ser negativo'),
  annualLimit: z.number().min(0, 'Limite anual não pode ser negativo'),
  rate25Percent: z.number().min(0, 'Taxa não pode ser negativa'),
  rate50Percent: z.number().min(0, 'Taxa não pode ser negativa'),
  rate100Percent: z.number().min(0, 'Taxa não pode ser negativa'),
  sundayWorkRequiresCompensatoryRest: z.boolean(),
  compensatoryRestDays: z.number().min(0, 'Dias de descanso não podem ser negativos')
});

const mealAllowanceSchema = z.object({
  dailyAmount: z.number().min(0, 'Valor diário não pode ser negativo'),
  onlyOnWorkedDays: z.boolean()
});

const vacationSchema = z.object({
  periods: z.array(z.object({
    startDate: z.string().min(1, 'Data de início é obrigatória'),
    endDate: z.string().min(1, 'Data de fim é obrigatória'),
    description: z.string().optional()
  }))
});

type ContractFormData = z.infer<typeof contractSchema>;
type OTPolicyFormData = z.infer<typeof otPolicySchema>;
type MealAllowanceFormData = z.infer<typeof mealAllowanceSchema>;
type VacationFormData = z.infer<typeof vacationSchema>;

export default function PayrollConfigPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { activeContract, refreshContracts } = useActiveContract();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('contract');
  const [contracts, setContracts] = useState<any[]>([]);
  const [ariaMessage, setAriaMessage] = useState('');
  const [activeTab, setActiveTab] = useState('contract');
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [showCreateContractDialog, setShowCreateContractDialog] = useState(false);
  const [mealAllowanceConfig, setMealAllowanceConfig] = useState<any>(null);

  // Handlers para os botões de configuração
  const handleConfigureContract = () => {
    // TODO: Navegar para página de configuração do contrato
    toast({
      title: "Configuração do Contrato",
      description: "Funcionalidade em desenvolvimento. Em breve poderá configurar os dados básicos do contrato.",
    });
  };

  const handleConfigureOvertime = () => {
    // TODO: Navegar para página de configuração de horas extras
    toast({
      title: "Políticas de Horas Extras",
      description: "Funcionalidade em desenvolvimento. Em breve poderá configurar as regras de horas extras.",
    });
  };

  const handleConfigureMeal = () => {
    // TODO: Navegar para página de configuração de subsídio alimentação
    toast({
      title: "Subsídio de Alimentação",
      description: "Funcionalidade em desenvolvimento. Em breve poderá configurar o subsídio de alimentação.",
    });
  };

  const handleConfigureVacation = () => {
    // TODO: Navegar para página de configuração de férias
    toast({
      title: "Gestão de Férias",
      description: "Funcionalidade em desenvolvimento. Em breve poderá gerir os períodos de férias.",
    });
  };

  const handleConfigureSpecialLeave = () => {
    // Funcionalidade implementada através do componente PayrollLeavesManager
  };

  const handleConfigureCompensatoryRest = () => {
    // Funcionalidade implementada através do componente CompensatoryRestManager
  };

  const handleConfigureMileage = () => {
    // Funcionalidade implementada através do componente PayrollMileagePolicyForm
  };

  const handleConfigureBonus = () => {
    // Funcionalidade implementada através do componente PayrollBonusConfig
  };

  const handleConfigureDeductions = () => {
    toast({
      title: "Descontos",
      description: "Funcionalidade em desenvolvimento. Em breve poderá configurar descontos e deduções.",
    });
  };
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setActiveContract } = useActiveContract();
  const mainContentRef = useRef<HTMLHeadingElement>(null);
  const [didJustCreate, setDidJustCreate] = useState(false);

  // Form instances
  const contractForm = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      baseSalary: 870,
      currency: 'EUR',
      hoursPerWeek: 40,
      standardWorkStart: '09:00',
      standardWorkEnd: '18:00',
      standardBreakMinutes: 60,
      useStandardSchedule: true
    }
  });

  const otPolicyForm = useForm<OTPolicyFormData>({
    resolver: zodResolver(otPolicySchema),
    defaultValues: {
      weeklyLimit: 8,
      annualLimit: 150,
      rate25Percent: 25,
      rate50Percent: 50,
      rate100Percent: 100,
      sundayWorkRequiresCompensatoryRest: true,
      compensatoryRestDays: 1
    }
  });

  const mealAllowanceForm = useForm<MealAllowanceFormData>({
    resolver: zodResolver(mealAllowanceSchema),
    defaultValues: {
      dailyAmount: 0,
      onlyOnWorkedDays: true
    }
  });

  const vacationForm = useForm<VacationFormData>({
    resolver: zodResolver(vacationSchema),
    defaultValues: {
      periods: []
    }
  });

  const loadData = async () => {
    if (!user?.id) {
      logger.warn('No user ID available for loading data');
      return;
    }

    try {
      setIsLoading(true);
      logger.debug('Loading contracts for user:', user.id);
      
      const contractsData = await payrollService.getContracts(user.id);
      logger.debug('Loaded contracts:', contractsData);
      
      setContracts(contractsData || []);
      
      if (contractsData && contractsData.length > 0) {
        logger.debug('Contracts loaded successfully');
      } else {
        logger.warn('No contracts found');
      }
    } catch (error) {
      logger.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Contract selection is now handled by the global ActiveContractContext


  
  useEffect(() => {
    if (user && user.id) {
      loadData();
    }
  }, [user, authLoading]);

  // Carregar configuração do subsídio de alimentação quando o contrato mudar
  useEffect(() => {
    const loadMealAllowanceConfig = async () => {
      if (user?.id && activeContract?.id) {
        try {
          logger.debug('Loading meal allowance config for contract:', activeContract.id);
          const config = await payrollService.getMealAllowanceConfig(user.id, activeContract.id);
          logger.debug('Loaded meal allowance config:', config);
          setMealAllowanceConfig(config);
        } catch (error) {
          logger.error('Error loading meal allowance config:', error);
          setMealAllowanceConfig(null);
        }
      } else {
        setMealAllowanceConfig(null);
      }
    };

    loadMealAllowanceConfig();
  }, [user?.id, activeContract?.id]);
  

  // Abrir modal automaticamente quando navegamos com ?new=1
  useEffect(() => {
    const param = new URLSearchParams(location.search).get('new');
    if (param === '1') {
      setShowCreateContractDialog(true);
      // limpar o parâmetro 'new' do URL para evitar reaberturas inesperadas
      try {
        const next = new URLSearchParams(location.search);
        next.delete('new');
        setSearchParams(next, { replace: true });
      } catch (e) {
        logger.warn('Falha ao limpar ?new do URL', e);
      }
    }
  }, [location.search]);
  
  const addVacationPeriod = () => {
    const currentPeriods = vacationForm.getValues('periods');
    vacationForm.setValue('periods', [
      ...currentPeriods,
      { startDate: '', endDate: '', description: '' }
    ]);
  };
  
  const removeVacationPeriod = (index: number) => {
    const currentPeriods = vacationForm.getValues('periods');
    vacationForm.setValue('periods', currentPeriods.filter((_, i) => i !== index));
  };
  
  const sections = [
    { id: 'contract', label: 'Contrato Base', icon: Settings },
    { id: 'overtime', label: 'Horas Extras', icon: Clock },
    { id: 'meal', label: 'Subsídio Alimentação', icon: Utensils },
    { id: 'vacation', label: 'Férias', icon: Calendar },
    { id: 'leaves', label: 'Licenças Especiais', icon: FileText },
    { id: 'compensatory', label: 'Descanso Compensatório', icon: Coffee },
    { id: 'mileage', label: 'Quilometragem', icon: Car },
    { id: 'bonus', label: 'Bónus e Prémios', icon: Award },
    { id: 'deductions', label: 'Descontos', icon: Percent }
  ];
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Precisa de estar autenticado para aceder à configuração de folha de pagamento.
            </p>
            <Button onClick={() => window.location.href = '/auth/login'}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  // Mostrar formulário rápido se não há contratos e showQuickForm é true
  if (showQuickForm) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuração do Payroll</h1>
            <p className="text-muted-foreground">
              Crie o seu primeiro contrato para começar.
            </p>
          </div>
        </div>
        
        <QuickContractForm
          onContractCreated={async (newContract) => {
              setContracts(prev => [...prev, newContract]);
              // Atualizar a lista de contratos no contexto
              await refreshContracts();
              setShowQuickForm(false);
            }}
          onCancel={() => setShowQuickForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Região de anúncio para leitores de ecrã */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{ariaMessage}</div>
      <div className="flex items-center justify-between">
        <h1 ref={mainContentRef} tabIndex={-1} className="text-3xl font-bold">Configurações</h1>
      </div>
      
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Contrato em Configuração
          </CardTitle>
          <CardDescription>
            Todas as configurações abaixo serão aplicadas ao contrato selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            logger.debug('Rendering contracts section, contracts.length:', contracts.length);
            logger.debug('Current contracts state:', contracts);
            return contracts.length > 0;
          })() ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {/* Espaço reservado para futuras funcionalidades */}
              </div>
              {activeContract && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-800">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Configurando:</span>
                      <span className="font-semibold">{activeContract.name}</span>
                      {activeContract.company_name && (
                        <span className="text-sm text-blue-600">• {activeContract.company_name}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Não existem contratos criados. Por favor, crie o seu primeiro contrato para começar a usar a folha de pagamento.</span>
                  <Button 
                    size="sm" 
                    onClick={() => setShowQuickForm(true)}
                    className="ml-4"
                  >
                    <Settings className="mr-2 h-3 w-3" />
                    Criar Primeiro Contrato
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tabs de Configuração - só aparecem quando há um contrato selecionado */}
      {activeContract && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="contract" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Contrato Base
            </TabsTrigger>
            <TabsTrigger value="deductions" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Descontos
            </TabsTrigger>
            <TabsTrigger value="overtime" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horas Extras
            </TabsTrigger>
            <TabsTrigger value="subsidies" className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              Subsídios
            </TabsTrigger>
            <TabsTrigger value="vacation" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Férias
            </TabsTrigger>
            <TabsTrigger value="bonus" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Bónus
            </TabsTrigger>
            <TabsTrigger value="other" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Outros
            </TabsTrigger>
          </TabsList>

          {/* Tab: Contrato Base */}
          <TabsContent value="contract">
            <PayrollContractForm 
              contract={activeContract} 
              onSave={(updatedContract) => {
                // Atualizar contrato existente
                setContracts(prev => prev.map(c => c.id === updatedContract.id ? updatedContract : c));
                toast({
                  title: 'Contrato atualizado',
                  description: 'As alterações foram guardadas com sucesso.'
                });
              }}
            />
          </TabsContent>

          {/* Tab: Descontos */}
          <TabsContent value="deductions">
            <PayrollDeductionConfig contractId={activeContract.id} />
          </TabsContent>

          {/* Tab: Horas Extras */}
          <TabsContent value="overtime">
            <PayrollOTPolicyForm contractId={activeContract.id} />
          </TabsContent>

          {/* Tab: Subsídios */}
          <TabsContent value="subsidies">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Configuração de Subsídios
                </CardTitle>
                <CardDescription>
                  Configure os subsídios de alimentação, férias e natal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="meal" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="meal" className="flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  Alimentação
                </TabsTrigger>
                    <TabsTrigger value="vacation-bonus" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Férias
                    </TabsTrigger>
                    <TabsTrigger value="christmas-bonus" className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Natal
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="meal">
                    <PayrollMealAllowanceForm 
                      contractId={activeContract.id} 
                      config={mealAllowanceConfig}
                      onSave={(savedConfig) => {
                        logger.debug('Meal allowance config saved:', savedConfig);
                        setMealAllowanceConfig(savedConfig);
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="vacation-bonus">
                    <PayrollBonusConfig bonusType="mandatory" specificSubsidy="vacation" contractId={activeContract.id} />
                  </TabsContent>

                  <TabsContent value="christmas-bonus">
                    <PayrollBonusConfig bonusType="mandatory" specificSubsidy="christmas" contractId={activeContract.id} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Férias */}
          <TabsContent value="vacation">
            <PayrollVacationsManager contractId={activeContract.id} />
          </TabsContent>

          {/* Tab: Bónus */}
          <TabsContent value="bonus">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Configuração de Bónus
                </CardTitle>
                <CardDescription>
                  Configure prémios de produtividade e bónus personalizados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="performance" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="performance" className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Prémios de Produtividade
                    </TabsTrigger>
                    <TabsTrigger value="custom" className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Bónus Personalizados
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="performance">
                    <PayrollBonusConfig bonusType="performance" />
                  </TabsContent>

                  <TabsContent value="custom">
                    <PayrollBonusConfig bonusType="custom" />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Outras Configurações */}
          <TabsContent value="other">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Outras Configurações
                </CardTitle>
                <CardDescription>
                  Configure licenças especiais, quilometragem e descontos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Licenças Especiais */}
                  <PayrollLeavesManager contractId={activeContract.id} />

                  {/* Descanso Compensatório */}
                  <CompensatoryRestManager contractId={activeContract.id} />

                  {/* Quilometragem */}
                  <PayrollMileagePolicyForm 
                    contractId={activeContract.id}
                    onSave={(policy) => {
                      // Política salva com sucesso
                      console.log('Política de quilometragem salva:', policy);
                    }}
                    onCancel={() => {
                      // Cancelar edição
                      console.log('Edição de política cancelada');
                    }}
                  />

                  {/* Feriados removidos - sincronização automática implementada */}
                  {/* Descontos movidos para tab dedicada */}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}


    </div>
  );
}