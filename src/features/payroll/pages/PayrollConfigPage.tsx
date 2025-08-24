import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Separator } from '../../../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { LoadingSpinner } from '../../../components/ui/loading-states';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { payrollService } from '../services/payrollService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Settings, 
  Clock, 
  DollarSign, 
  Car, 
  Calendar, 
  Utensils,
  Percent,
  Save,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PayrollDeductionConfig } from '../components/PayrollDeductionConfig';

// Schemas de validação
const contractSchema = z.object({
  baseSalary: z.number()
    .min(870, 'Salário não pode ser inferior ao salário mínimo nacional (€870 - 2025)')
    .max(50000, 'Salário máximo permitido: €50.000'),
  currency: z.string().min(1, 'Moeda é obrigatória'),
  hoursPerWeek: z.number().min(0.5, 'Horas por semana deve ser maior que 0.5').max(40, 'Máximo 40 horas por semana (limite legal)'),
  standardWorkStart: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  standardWorkEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  standardBreakMinutes: z.number().min(60, 'Mínimo 1 hora de pausa (60 min)').max(120, 'Máximo 2 horas de pausa (120 min)'),
  useStandardSchedule: z.boolean()
});

const otPolicySchema = z.object({
  // Multiplicadores conforme Código do Trabalho português
  firstHourMultiplier: z.number().min(1.5, 'Mínimo 50% (1.5x)').max(2, 'Máximo 100% (2x)').default(1.5), // 50% primeira hora
  subsequentHoursMultiplier: z.number().min(1.75, 'Mínimo 75% (1.75x)').max(2.5, 'Máximo 150% (2.5x)').default(1.75), // 75% horas seguintes
  weekendMultiplier: z.number().min(2, 'Mínimo 100% (2x)').max(3, 'Máximo 200% (3x)').default(2), // 100% fins de semana
  holidayMultiplier: z.number().min(2, 'Mínimo 100% (2x)').max(3, 'Máximo 200% (3x)').default(2), // 100% feriados
  nightStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  nightEndTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  roundingMinutes: z.number().min(1, 'Mínimo 1 minuto').max(60, 'Máximo 60 minutos'),
  dailyLimitHours: z.number().min(1, 'Mínimo 1 hora').max(2, 'Máximo 2 horas por dia').default(2), // Limite legal: 2h/dia
  annualLimitHours: z.number().min(150, 'Mínimo 150 horas').max(175, 'Máximo 175 horas').default(150), // 150h empresas ≥50 funcionários, 175h empresas <50
  weeklyLimitHours: z.number().min(48, 'Mínimo 48 horas').max(60, 'Máximo 60 horas').default(48) // 48h semanais (40h + 8h extra)
});

const mealAllowanceSchema = z.object({
  dailyAmount: z.number().min(0, 'Valor não pode ser negativo'),
  excludedMonths: z.array(z.number().min(1).max(12)).max(12, 'Máximo 12 meses'),
  paymentMethod: z.enum(['cash', 'card'], { required_error: 'Método de pagamento é obrigatório' })
}).refine((data) => {
  // Validar limites de isenção baseados no método de pagamento (2025)
  const maxExemptionCash = 6.00; // €6.00/dia para dinheiro
  const maxExemptionCard = 10.20; // €10.20/dia para cartão/vale
  
  if (data.paymentMethod === 'cash' && data.dailyAmount > maxExemptionCash) {
    return false;
  }
  
  if (data.paymentMethod === 'card' && data.dailyAmount > maxExemptionCard) {
    return false;
  }
  
  return true;
}, {
  message: 'Valor excede o limite de isenção fiscal para o método de pagamento selecionado',
  path: ['dailyAmount']
});

const vacationSchema = z.object({
  // Configurações gerais de férias conforme Código do Trabalho
  annualVacationDays: z.number().min(22, 'Mínimo legal: 22 dias úteis').max(30, 'Máximo: 30 dias úteis').default(22),
  minimumConsecutiveDays: z.number().min(10, 'Mínimo legal: 10 dias úteis consecutivos').max(22, 'Máximo: 22 dias úteis').default(10),
  allowInterpolatedVacation: z.boolean().default(true),
  
  // Períodos de férias marcados
  periods: z.array(z.object({
    startDate: z.string().min(1, 'Data de início obrigatória'),
    endDate: z.string().min(1, 'Data de fim obrigatória'),
    description: z.string().optional(),
    isConsecutive: z.boolean().default(false),
    totalDays: z.number().optional()
  })).max(10, 'Máximo 10 períodos de férias'),
  
  // Configurações específicas para primeiro ano
  firstYearRules: z.object({
    daysPerMonth: z.number().min(2, 'Mínimo legal: 2 dias por mês').max(2, 'Máximo legal: 2 dias por mês').default(2),
    maxDaysFirstYear: z.number().min(20, 'Máximo legal: 20 dias úteis').max(20, 'Máximo legal: 20 dias úteis').default(20),
    minimumMonthsToEarn: z.number().min(6, 'Mínimo legal: 6 meses').max(6, 'Mínimo legal: 6 meses').default(6)
  }).default({
    daysPerMonth: 2,
    maxDaysFirstYear: 20,
    minimumMonthsToEarn: 6
  })
});

const mileagePolicySchema = z.object({
  enabled: z.boolean(),
  name: z.string().optional(),
  ratePerKm: z.number()
    .min(0.01, 'Taxa deve ser maior que 0')
    .max(0.40, 'Máximo €0,40/km para manter isenção fiscal (2025)')
    .optional(),
  monthlyCap: z.number().optional(),
  requireOrigin: z.boolean().optional(),
  requireDestination: z.boolean().optional(),
  requirePurpose: z.boolean().optional()
}).refine((data) => {
  // Se a política estiver ativada, ratePerKm é obrigatório
  if (data.enabled && (!data.ratePerKm || data.ratePerKm <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Taxa por quilómetro é obrigatória quando a política está ativada",
  path: ["ratePerKm"]
}).refine((data) => {
  // Se a política estiver ativada, os campos booleanos devem ter valores definidos
  if (data.enabled) {
    if (data.requireOrigin === undefined || data.requireDestination === undefined || data.requirePurpose === undefined) {
      return false;
    }
  }
  return true;
}, {
  message: "Configurações de campos obrigatórios devem ser definidas quando a política está ativada",
  path: ["requireOrigin"]
})

type ContractFormData = z.infer<typeof contractSchema>;
type OTPolicyFormData = z.infer<typeof otPolicySchema>;
type MealAllowanceFormData = z.infer<typeof mealAllowanceSchema>;
type VacationFormData = z.infer<typeof vacationSchema>;
type MileagePolicyFormData = z.infer<typeof mileagePolicySchema>;

const PayrollConfigPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('contract');
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('');

  // Formulários
  const contractForm = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      baseSalary: 1000,
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
      dayMultiplier: 1.5, // 50% primeira hora conforme Código do Trabalho
      nightMultiplier: 1.75, // 75% horas seguintes conforme Código do Trabalho
      weekendMultiplier: 2.0, // 100% fins de semana conforme Código do Trabalho
      holidayMultiplier: 2.0, // 100% feriados conforme Código do Trabalho
      nightStartTime: '22:00',
      nightEndTime: '07:00',
      roundingMinutes: 15,
      dailyLimitHours: 2,
      annualLimitHours: 150,
      weeklyLimitHours: 48
    }
  });

  const mealAllowanceForm = useForm<MealAllowanceFormData>({
    resolver: zodResolver(mealAllowanceSchema),
    defaultValues: {
      dailyAmount: 10.20, // Valor atualizado para 2025 conforme legislação
      excludedMonths: [],
      paymentMethod: 'card' // Cartão/vale como padrão (limite maior)
    }
  });

  const vacationForm = useForm<VacationFormData>({
    resolver: zodResolver(vacationSchema),
    defaultValues: {
      periods: []
    }
  });

  const mileagePolicyForm = useForm<MileagePolicyFormData>({
    resolver: zodResolver(mileagePolicySchema),
    defaultValues: {
      enabled: false,
      name: '',
      ratePerKm: undefined,
      monthlyCap: undefined,
      requireOrigin: true,
      requireDestination: true,
      requirePurpose: true
    }
  });

  const handleSaveContract = async (data: ContractFormData) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Criar um horário padrão baseado nos dados do formulário
      const scheduleJson = {
        monday: { start: data.standardWorkStart, end: data.standardWorkEnd, break_minutes: data.standardBreakMinutes },
        tuesday: { start: data.standardWorkStart, end: data.standardWorkEnd, break_minutes: data.standardBreakMinutes },
        wednesday: { start: data.standardWorkStart, end: data.standardWorkEnd, break_minutes: data.standardBreakMinutes },
        thursday: { start: data.standardWorkStart, end: data.standardWorkEnd, break_minutes: data.standardBreakMinutes },
        friday: { start: data.standardWorkStart, end: data.standardWorkEnd, break_minutes: data.standardBreakMinutes },
        saturday: { start: null, end: null, break_minutes: 0 },
        sunday: { start: null, end: null, break_minutes: 0 }
      };

      // Verificar se já existe um contrato para este utilizador
      const existingContract = await payrollService.getActiveContract(user.id);

      const contractData = {
        name: 'Contrato Principal',
        base_salary_cents: Math.round(data.baseSalary * 100),
        currency: data.currency,
        schedule_json: scheduleJson,
        meal_allowance_cents_per_day: 0,
        meal_on_worked_days: true,
        vacation_bonus_mode: 'monthly' as const,
        christmas_bonus_mode: 'monthly' as const,
        is_active: true
      };

      if (existingContract) {
        // Atualizar contrato existente
        await payrollService.updateContract(existingContract.id, contractData);
      } else {
        // Criar novo contrato
        await payrollService.createContract(user.id, user.family_id, contractData);
      }
      
      toast({
        title: "Contrato atualizado",
        description: "As configurações do contrato foram guardadas.",
      });
    } catch (error) {
      console.error('Erro ao guardar contrato:', error);
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível atualizar o contrato.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOTPolicy = async (data: OTPolicyFormData) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await payrollService.upsertOTPolicy(user.id, data);
      
      toast({
        title: "Política de horas extra atualizada",
        description: "As configurações foram guardadas.",
      });
    } catch (error) {
      console.error('Erro ao guardar política OT:', error);
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível atualizar a política.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMealAllowance = async (data: MealAllowanceFormData) => {
    if (!user || !selectedContractId) return;
    
    setIsSaving(true);
    try {
      await payrollService.upsertMealAllowanceConfig(user.id, selectedContractId, data);
      
      toast({
        title: "Subsídio de alimentação atualizado",
        description: "As configurações foram guardadas.",
      });
    } catch (error) {
      console.error('Erro ao guardar subsídio:', error);
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível atualizar o subsídio.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVacation = async (data: VacationFormData) => {
    if (!user || !selectedContractId) return;
    
    setIsSaving(true);
    try {
      // Usar as novas funções do payrollService
      await payrollService.deleteVacationPeriods(user.id);
      
      if (data.periods.length > 0) {
        // Adicionar contract_id a cada período
        const periodsWithContract = data.periods.map(period => ({
          ...period,
          contract_id: selectedContractId
        }));
        await payrollService.upsertVacationPeriods(user.id, periodsWithContract);
      }
      
      toast({
        title: "Períodos de férias atualizados",
        description: "As configurações foram guardadas.",
      });
    } catch (error) {
      console.error('Erro ao guardar férias:', error);
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível atualizar as férias.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMileagePolicy = async (data: MileagePolicyFormData) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      if (data.enabled) {
        // Se a política está ativada, validar e guardar
        if (!data.ratePerKm || data.ratePerKm <= 0) {
          toast({
            title: "Taxa obrigatória",
            description: "A taxa por quilómetro é obrigatória quando a política está ativada.",
            variant: "destructive",
          });
          return;
        }
        
        await payrollService.upsertMileagePolicy(user.id, data);
        toast({
          title: "Política ativada",
          description: "A política de quilometragem foi ativada e guardada com sucesso.",
        });
      } else {
        // Se a política está desativada, remover/desativar
        await payrollService.deactivateMileagePolicy(user.id);
        toast({
          title: "Política desativada",
          description: "A política de quilometragem foi desativada.",
        });
      }
    } catch (error) {
      console.error('Erro ao guardar política de quilometragem:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro ao guardar",
        description: `Não foi possível guardar a política: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Primeiro carregar contratos
      const contractsData = await payrollService.getContracts ? await payrollService.getContracts(user.id) : [];
      setContracts(contractsData);
      
      // Se não há contratos, não carregar outras configurações
      if (contractsData.length === 0) {
        setIsLoading(false);
        return;
      }
      
      // Selecionar contrato ativo ou o primeiro disponível
      const activeContract = contractsData.find(c => c.is_active) || contractsData[0];
      setSelectedContractId(activeContract.id);
      
      await loadContractData(activeContract.id);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Carregar dados específicos do contrato
  const loadContractData = async (contractId: string) => {
    if (!user || !contractId) return;
    
    try {
      // Carregar dados de todas as tabelas
      const [contractRes, otPolicyRes, mealAllowanceRes, vacationRes, allMileagePolicies] = await Promise.all([
        payrollService.getActiveContract(user.id),
        payrollService.getActiveOTPolicy(user.id),
        payrollService.getMealAllowanceConfig(user.id, contractId),
        payrollService.getVacations(user.id, contractId),
        payrollService.getAllMileagePolicies(user.id)
      ]);
      
      // Encontrar a política ativa (se existir)
      const mileagePolicyRes = allMileagePolicies.find(policy => policy.is_active) || null;
      
      // Atualizar formulário de contrato
      if (contractRes) {
        const schedule = contractRes.schedule_json || {};
        const mondaySchedule = schedule.monday || { start: '09:00', end: '18:00', break_minutes: 60 };
        
        contractForm.reset({
          baseSalary: contractRes.base_salary_cents ? contractRes.base_salary_cents / 100 : 0,
          currency: contractRes.currency || 'EUR',
          hoursPerWeek: 40, // Calcular baseado no horário ou usar valor padrão
          useStandardSchedule: true, // Assumir que usa horário padrão se tem schedule_json
          standardWorkStart: mondaySchedule.start || '09:00',
          standardWorkEnd: mondaySchedule.end || '18:00',
          standardBreakMinutes: mondaySchedule.break_minutes || 60
        });
      }
      
      // Atualizar formulário de política OT
      if (otPolicyRes) {
        otPolicyForm.reset({
          firstHourMultiplier: otPolicyRes.first_hour_multiplier || 1.5, // 50% primeira hora
          subsequentHoursMultiplier: otPolicyRes.subsequent_hours_multiplier || 1.75, // 75% horas seguintes
          weekendMultiplier: otPolicyRes.weekend_multiplier || 2.0, // 100% fins de semana
          holidayMultiplier: otPolicyRes.holiday_multiplier || 2.0, // 100% feriados
          nightStartTime: otPolicyRes.night_start_time || '22:00',
          nightEndTime: otPolicyRes.night_end_time || '06:00',
          roundingMinutes: otPolicyRes.rounding_minutes || 15,
          dailyLimitHours: otPolicyRes.daily_limit_hours || 2,
          annualLimitHours: otPolicyRes.annual_limit_hours || 175,
          weeklyLimitHours: otPolicyRes.weekly_limit_hours || 48
        });
      }
      
      // Atualizar formulário de subsídio de alimentação
      if (mealAllowanceRes) {
        mealAllowanceForm.reset({
          dailyAmount: (mealAllowanceRes.daily_amount_cents || 0) / 100,
          excludedMonths: mealAllowanceRes.excluded_months || [],
          paymentMethod: mealAllowanceRes.payment_method || 'card'
        });
      }
      
      // Atualizar formulário de férias
      if (vacationRes && vacationRes.length > 0) {
        const periods = vacationRes.map(period => ({
          startDate: period.start_date,
          endDate: period.end_date,
          description: period.description || '',
          isConsecutive: false,
          totalDays: undefined
        }));
        vacationForm.reset({ 
          periods,
          annualVacationDays: 22, // Mínimo legal português
          minimumConsecutiveDays: 10, // Mínimo legal português
          allowInterpolatedVacation: true,
          firstYearRules: {
            daysPerMonth: 2,
            maxDaysFirstYear: 20,
            minimumMonthsToEarn: 6
          }
        });
      } else {
        // Valores padrão conforme legislação portuguesa
        vacationForm.reset({
          periods: [],
          annualVacationDays: 22,
          minimumConsecutiveDays: 10,
          allowInterpolatedVacation: true,
          firstYearRules: {
            daysPerMonth: 2,
            maxDaysFirstYear: 20,
            minimumMonthsToEarn: 6
          }
        });
      }
      
      // Atualizar formulário de política de quilometragem
      if (mileagePolicyRes && mileagePolicyRes.is_active) {
        mileagePolicyForm.reset({
          enabled: true, // Política existe e está ativa
          name: mileagePolicyRes.name || 'Política de Quilometragem',
          ratePerKm: mileagePolicyRes.rate_cents_per_km ? mileagePolicyRes.rate_cents_per_km / 100 : 0,
          monthlyCap: mileagePolicyRes.monthly_cap_cents ? mileagePolicyRes.monthly_cap_cents / 100 : undefined,
          requireOrigin: mileagePolicyRes.requires_receipt || false,
          requireDestination: false,
          requirePurpose: true
        });
      } else {
        // Se não existe política ou está inativa, garantir que está desativada
        mileagePolicyForm.reset({
          enabled: false,
          name: 'Política de Quilometragem',
          ratePerKm: 0.40, // Valor de referência português para automóvel próprio
          monthlyCap: undefined,
          requireOrigin: true,
          requireDestination: true,
          requirePurpose: true
        });
      }
      
    } catch (error) {
      console.error('Erro ao carregar configurações do contrato:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as configurações do contrato.",
        variant: "destructive",
      });
    }
  };
  
  // Handler para mudança de contrato
  const handleContractChange = async (contractId: string) => {
    setSelectedContractId(contractId);
    await loadContractData(contractId);
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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
    { id: 'contract', title: 'Contrato', icon: DollarSign },
    { id: 'overtime', title: 'Horas Extra', icon: Clock },
    { id: 'meal', title: 'Subsídio Alimentação', icon: Utensils },
    { id: 'deductions', title: 'Descontos', icon: Percent },
    { id: 'vacation', title: 'Férias', icon: Calendar },
    { id: 'mileage', title: 'Quilometragem', icon: Car }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração</h1>
          <p className="text-muted-foreground">Gerir configurações do payroll</p>
        </div>
      </div>
      
      {/* Seletor de Contrato */}
      {contracts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="contract-select">Selecionar Contrato</Label>
              <Select value={selectedContractId} onValueChange={handleContractChange}>
                <SelectTrigger id="contract-select">
                  <SelectValue placeholder="Selecione um contrato" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.name} {contract.is_active && '(Ativo)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                As configurações abaixo aplicam-se ao contrato selecionado
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Nenhum contrato encontrado. Crie um contrato primeiro para configurar as outras opções.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menu de Navegação */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Secções
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? 'default' : 'ghost'}
                  className="w-full justify-start gap-2"
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon className="h-4 w-4" />
                  {section.title}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Conteúdo das Secções */}
        <div className="lg:col-span-3 space-y-6">
          {/* Contrato */}
          {activeSection === 'contract' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Configuração do Contrato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={contractForm.handleSubmit(handleSaveContract)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="baseSalary">Salário Base (mensal) ({contractForm.watch('currency') || 'EUR'})</Label>
                      <Input
                        id="baseSalary"
                        type="number"
                        step="0.01"
                        {...contractForm.register('baseSalary', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Salário mínimo nacional: €870 (2025)</p>
                      {contractForm.formState.errors.baseSalary && (
                        <p className="text-sm text-red-500">{contractForm.formState.errors.baseSalary.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Moeda</Label>
                      <Input
                        id="currency"
                        {...contractForm.register('currency')}
                      />
                      {contractForm.formState.errors.currency && (
                        <p className="text-sm text-red-500">{contractForm.formState.errors.currency.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hoursPerWeek">Horas por Semana</Label>
                      <Input
                        id="hoursPerWeek"
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="60"
                        placeholder="37.5"
                        {...contractForm.register('hoursPerWeek', { valueAsNumber: true })}
                      />
                      {contractForm.formState.errors.hoursPerWeek && (
                        <p className="text-sm text-red-500">{contractForm.formState.errors.hoursPerWeek.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="useStandardSchedule"
                        {...contractForm.register('useStandardSchedule')}
                      />
                      <Label htmlFor="useStandardSchedule">Usar horário padrão</Label>
                    </div>
                    
                    {contractForm.watch('useStandardSchedule') && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="standardWorkStart">Início</Label>
                          <Input
                            id="standardWorkStart"
                            type="time"
                            {...contractForm.register('standardWorkStart')}
                          />
                          {contractForm.formState.errors.standardWorkStart && (
                            <p className="text-sm text-red-500">{contractForm.formState.errors.standardWorkStart.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="standardWorkEnd">Fim</Label>
                          <Input
                            id="standardWorkEnd"
                            type="time"
                            {...contractForm.register('standardWorkEnd')}
                          />
                          {contractForm.formState.errors.standardWorkEnd && (
                            <p className="text-sm text-red-500">{contractForm.formState.errors.standardWorkEnd.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="standardBreakMinutes">Pausa (minutos)</Label>
                          <Input
                            id="standardBreakMinutes"
                            type="number"
                            {...contractForm.register('standardBreakMinutes', { valueAsNumber: true })}
                          />
                          {contractForm.formState.errors.standardBreakMinutes && (
                            <p className="text-sm text-red-500">{contractForm.formState.errors.standardBreakMinutes.message}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Button type="submit" disabled={isSaving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Guardando...' : 'Guardar Contrato'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Política de Horas Extra */}
          {activeSection === 'overtime' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Política de Horas Extra
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={otPolicyForm.handleSubmit(handleSaveOTPolicy)} className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstHourMultiplier">Primeira Hora Extra (50%)</Label>
                      <Input
                        id="firstHourMultiplier"
                        type="number"
                        step="0.01"
                        {...otPolicyForm.register('firstHourMultiplier', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Acréscimo para a primeira hora extra em dia útil</p>
                      {otPolicyForm.formState.errors.firstHourMultiplier && (
                        <p className="text-sm text-red-500">{otPolicyForm.formState.errors.firstHourMultiplier.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subsequentHoursMultiplier">Horas Seguintes (75%)</Label>
                      <Input
                        id="subsequentHoursMultiplier"
                        type="number"
                        step="0.01"
                        {...otPolicyForm.register('subsequentHoursMultiplier', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Acréscimo para horas subsequentes em dia útil</p>
                      {otPolicyForm.formState.errors.subsequentHoursMultiplier && (
                        <p className="text-sm text-red-500">{otPolicyForm.formState.errors.subsequentHoursMultiplier.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weekendMultiplier">Fim de Semana (100%)</Label>
                      <Input
                        id="weekendMultiplier"
                        type="number"
                        step="0.01"
                        {...otPolicyForm.register('weekendMultiplier', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Acréscimo para trabalho em sábados e domingos</p>
                      {otPolicyForm.formState.errors.weekendMultiplier && (
                        <p className="text-sm text-red-500">{otPolicyForm.formState.errors.weekendMultiplier.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="holidayMultiplier">Feriados (100%)</Label>
                      <Input
                        id="holidayMultiplier"
                        type="number"
                        step="0.01"
                        {...otPolicyForm.register('holidayMultiplier', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Acréscimo para trabalho em feriados nacionais</p>
                      {otPolicyForm.formState.errors.holidayMultiplier && (
                        <p className="text-sm text-red-500">{otPolicyForm.formState.errors.holidayMultiplier.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nightStartTime">Início da Noite</Label>
                      <Input
                        id="nightStartTime"
                        type="time"
                        {...otPolicyForm.register('nightStartTime')}
                      />
                      <p className="text-xs text-muted-foreground">Quando começa o período noturno</p>
                      {otPolicyForm.formState.errors.nightStartTime && (
                        <p className="text-sm text-red-500">{otPolicyForm.formState.errors.nightStartTime.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nightEndTime">Fim da Noite</Label>
                      <Input
                        id="nightEndTime"
                        type="time"
                        {...otPolicyForm.register('nightEndTime')}
                      />
                      <p className="text-xs text-muted-foreground">Quando termina o período noturno</p>
                      {otPolicyForm.formState.errors.nightEndTime && (
                        <p className="text-sm text-red-500">{otPolicyForm.formState.errors.nightEndTime.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roundingMinutes">Arredondamento (min)</Label>
                      <Input
                        id="roundingMinutes"
                        type="number"
                        {...otPolicyForm.register('roundingMinutes', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Arredondar horas para múltiplos de X minutos</p>
                      {otPolicyForm.formState.errors.roundingMinutes && (
                        <p className="text-sm text-red-500">{otPolicyForm.formState.errors.roundingMinutes.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Limites de Horas Extra</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dailyLimitHours">Limite Diário (horas)</Label>
                        <Input
                          id="dailyLimitHours"
                          type="number"
                          step="0.5"
                          {...otPolicyForm.register('dailyLimitHours', { valueAsNumber: true })}
                        />
                        <p className="text-xs text-muted-foreground">Máximo de horas extra por dia</p>
                        {otPolicyForm.formState.errors.dailyLimitHours && (
                          <p className="text-sm text-red-500">{otPolicyForm.formState.errors.dailyLimitHours.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weeklyLimitHours">Limite Semanal (horas)</Label>
                        <Input
                          id="weeklyLimitHours"
                          type="number"
                          step="0.5"
                          {...otPolicyForm.register('weeklyLimitHours', { valueAsNumber: true })}
                        />
                        <p className="text-xs text-muted-foreground">Máximo de horas totais por semana</p>
                        {otPolicyForm.formState.errors.weeklyLimitHours && (
                          <p className="text-sm text-red-500">{otPolicyForm.formState.errors.weeklyLimitHours.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="annualLimitHours">Limite Anual (horas)</Label>
                        <Input
                          id="annualLimitHours"
                          type="number"
                          {...otPolicyForm.register('annualLimitHours', { valueAsNumber: true })}
                        />
                        <p className="text-xs text-muted-foreground">Máximo de horas extra por ano</p>
                        {otPolicyForm.formState.errors.annualLimitHours && (
                          <p className="text-sm text-red-500">{otPolicyForm.formState.errors.annualLimitHours.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={isSaving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Guardando...' : (mileagePolicyForm.watch('enabled') ? 'Guardar Política' : 'Desativar Política')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Subsídio de Alimentação */}
          {activeSection === 'meal' && selectedContractId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Subsídio de Alimentação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={mealAllowanceForm.handleSubmit(handleSaveMealAllowance)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dailyAmount">Valor Diário ({contractForm.watch('currency') || 'EUR'})</Label>
                      <Input
                        id="dailyAmount"
                        type="number"
                        step="0.01"
                        {...mealAllowanceForm.register('dailyAmount', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Valor pago por cada dia trabalhado</p>
                      {(() => {
                        const dailyAmount = mealAllowanceForm.watch('dailyAmount');
                        const paymentMethod = mealAllowanceForm.watch('paymentMethod');
                        const maxExemption = paymentMethod === 'card' ? 10.20 : 6.00;
                        const warningThreshold = maxExemption * 0.9; // 90% do limite
                        
                        if (dailyAmount > maxExemption) {
                          return (
                            <p className="text-sm text-red-500 font-medium">
                              ⚠️ Valor excede o limite de isenção fiscal (€{maxExemption.toFixed(2)}/dia)
                            </p>
                          );
                        } else if (dailyAmount > warningThreshold) {
                          return (
                            <p className="text-sm text-amber-600 font-medium">
                              ⚠️ Valor próximo do limite de isenção fiscal (€{maxExemption.toFixed(2)}/dia)
                            </p>
                          );
                        }
                        return null;
                      })()}
                      {mealAllowanceForm.formState.errors.dailyAmount && (
                        <p className="text-sm text-red-500">{mealAllowanceForm.formState.errors.dailyAmount.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                      <Select
                        value={mealAllowanceForm.watch('paymentMethod')}
                        onValueChange={(value) => mealAllowanceForm.setValue('paymentMethod', value as 'cash' | 'card')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="card">Cartão/Vale (até €10.20/dia isento)</SelectItem>
                          <SelectItem value="cash">Dinheiro (até €6.00/dia isento)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {mealAllowanceForm.watch('paymentMethod') === 'card' 
                          ? 'Limite de isenção: €10.20/dia (2025)'
                          : 'Limite de isenção: €6.00/dia (2025)'
                        }
                      </p>
                      {mealAllowanceForm.formState.errors.paymentMethod && (
                        <p className="text-sm text-red-500">{mealAllowanceForm.formState.errors.paymentMethod.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Meses Excluídos</Label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {[
                        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
                      ].map((month, index) => {
                        const monthNumber = index + 1;
                        const excludedMonths = mealAllowanceForm.watch('excludedMonths') || [];
                        const isExcluded = excludedMonths.includes(monthNumber);
                        
                        return (
                          <Button
                            key={month}
                            type="button"
                            variant={isExcluded ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const current = mealAllowanceForm.getValues('excludedMonths') || [];
                              if (isExcluded) {
                                mealAllowanceForm.setValue('excludedMonths', current.filter(m => m !== monthNumber));
                              } else {
                                mealAllowanceForm.setValue('excludedMonths', [...current, monthNumber]);
                              }
                            }}
                          >
                            {month}
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">Meses em que o subsídio não é pago (ex: férias)</p>
                  </div>
                  
                  <Button type="submit" disabled={isSaving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Guardando...' : 'Guardar Subsídio'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Descontos */}
          {activeSection === 'deductions' && selectedContractId && (
            <PayrollDeductionConfig contractId={selectedContractId} />
          )}

          {/* Férias */}
          {activeSection === 'vacation' && selectedContractId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Configuração de Férias
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configurações conforme Código do Trabalho português
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={vacationForm.handleSubmit(handleSaveVacation)} className="space-y-6">
                  {/* Configurações Gerais */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Configurações Gerais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="annualVacationDays">Dias de Férias Anuais</Label>
                        <Input
                          id="annualVacationDays"
                          type="number"
                          min="22"
                          max="30"
                          {...vacationForm.register('annualVacationDays', { 
                            setValueAs: (value) => value === '' ? 22 : parseInt(value) 
                          })}
                        />
                        <p className="text-xs text-muted-foreground">Mínimo legal: 22 dias úteis</p>
                        {vacationForm.formState.errors.annualVacationDays && (
                          <p className="text-sm text-red-500">{vacationForm.formState.errors.annualVacationDays.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minimumConsecutiveDays">Período Mínimo Consecutivo</Label>
                        <Input
                          id="minimumConsecutiveDays"
                          type="number"
                          min="10"
                          max="22"
                          {...vacationForm.register('minimumConsecutiveDays', { 
                            setValueAs: (value) => value === '' ? 10 : parseInt(value) 
                          })}
                        />
                        <p className="text-xs text-muted-foreground">Mínimo legal: 10 dias úteis consecutivos</p>
                        {vacationForm.formState.errors.minimumConsecutiveDays && (
                          <p className="text-sm text-red-500">{vacationForm.formState.errors.minimumConsecutiveDays.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Switch
                            checked={vacationForm.watch('allowInterpolatedVacation')}
                            onCheckedChange={(checked) => vacationForm.setValue('allowInterpolatedVacation', checked)}
                          />
                          Permitir Férias Interpoladas
                        </Label>
                        <p className="text-xs text-muted-foreground">Permitir divisão das férias em períodos não consecutivos</p>
                      </div>
                    </div>
                  </div>

                  {/* Regras do Primeiro Ano */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Regras do Primeiro Ano</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Dias por Mês Trabalhado</Label>
                        <Input
                          type="number"
                          value="2"
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">Fixo por lei: 2 dias por mês</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Máximo no Primeiro Ano</Label>
                        <Input
                          type="number"
                          value="20"
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">Máximo legal: 20 dias úteis</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Meses Mínimos para Direito</Label>
                        <Input
                          type="number"
                          value="6"
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">Mínimo legal: 6 meses</p>
                      </div>
                    </div>
                  </div>

                  {/* Períodos de Férias Marcados */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Períodos de Férias Marcados</h3>
                    {vacationForm.watch('periods')?.map((period, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Período {index + 1}</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeVacationPeriod(index)}
                          >
                            Remover
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Data de Início</Label>
                            <Input
                              type="date"
                              {...vacationForm.register(`periods.${index}.startDate`)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Data de Fim</Label>
                            <Input
                              type="date"
                              {...vacationForm.register(`periods.${index}.endDate`)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Descrição (opcional)</Label>
                            <Input
                              placeholder="Ex: Férias de verão"
                              {...vacationForm.register(`periods.${index}.description`)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={addVacationPeriod}>
                      Adicionar Período
                    </Button>
                    <Button type="submit" disabled={isSaving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Guardando...' : 'Guardar Férias'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Política de Quilometragem */}
          {activeSection === 'mileage' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Política de Quilometragem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={mileagePolicyForm.handleSubmit(handleSaveMileagePolicy)} className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="enabled" className="text-base font-medium">Política de Quilometragem</Label>
                      <p className="text-sm text-muted-foreground">
                        Ativar reembolso por quilómetros percorridos em viagens de trabalho
                      </p>
                    </div>
                    <Switch
                      id="enabled"
                      checked={mileagePolicyForm.watch('enabled')}
                      onCheckedChange={(checked) => mileagePolicyForm.setValue('enabled', checked)}
                    />
                  </div>
                  
                  {mileagePolicyForm.watch('enabled') && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome da Política (opcional)</Label>
                        <Input
                          id="name"
                          placeholder="Ex: Política de Quilometragem"
                          {...mileagePolicyForm.register('name')}
                        />
                        {mileagePolicyForm.formState.errors.name && (
                          <p className="text-sm text-red-500">{mileagePolicyForm.formState.errors.name.message}</p>
                        )}
                      </div>
                  
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ratePerKm">Taxa por Quilómetro ({contractForm.watch('currency') || 'EUR'})</Label>
                          <Input
                            id="ratePerKm"
                            type="number"
                            step="0.01"
                            {...mileagePolicyForm.register('ratePerKm', { 
                              setValueAs: (value) => value === '' ? undefined : parseFloat(value) 
                            })}
                          />
                          <p className="text-xs text-muted-foreground">Valor pago por cada quilómetro percorrido (referência: €0,40/km para automóvel próprio)</p>
                          {mileagePolicyForm.formState.errors.ratePerKm && (
                            <p className="text-sm text-red-500">{mileagePolicyForm.formState.errors.ratePerKm.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="monthlyCap">Limite Mensal ({contractForm.watch('currency') || 'EUR'}) - Opcional</Label>
                          <Input
                            id="monthlyCap"
                            type="number"
                            step="0.01"
                            {...mileagePolicyForm.register('monthlyCap', { 
                              setValueAs: (value) => value === '' ? undefined : parseFloat(value) 
                            })}
                          />
                          <p className="text-xs text-muted-foreground">Valor máximo pago por mês (deixar vazio para sem limite)</p>
                          {mileagePolicyForm.formState.errors.monthlyCap && (
                            <p className="text-sm text-red-500">{mileagePolicyForm.formState.errors.monthlyCap.message}</p>
                          )}
                        </div>
                      </div>
                  
                      <Separator />
                      
                      <div className="space-y-3">
                        <Label>Campos Obrigatórios</Label>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="requireOrigin"
                              checked={mileagePolicyForm.watch('requireOrigin')}
                              onCheckedChange={(checked) => mileagePolicyForm.setValue('requireOrigin', checked)}
                            />
                            <Label htmlFor="requireOrigin">Exigir origem da viagem</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="requireDestination"
                              checked={mileagePolicyForm.watch('requireDestination')}
                              onCheckedChange={(checked) => mileagePolicyForm.setValue('requireDestination', checked)}
                            />
                            <Label htmlFor="requireDestination">Exigir destino da viagem</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="requirePurpose"
                              checked={mileagePolicyForm.watch('requirePurpose')}
                              onCheckedChange={(checked) => mileagePolicyForm.setValue('requirePurpose', checked)}
                            />
                            <Label htmlFor="requirePurpose">Exigir motivo da viagem</Label>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <Button type="submit" disabled={isSaving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Guardando...' : 'Guardar Política'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollConfigPage;