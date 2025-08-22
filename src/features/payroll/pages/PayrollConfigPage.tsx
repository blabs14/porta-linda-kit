import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Separator } from '../../../components/ui/separator';
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
  Save,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Schemas de validação
const contractSchema = z.object({
  baseSalary: z.number().min(0.01, 'Salário deve ser maior que 0'),
  currency: z.string().min(1, 'Moeda é obrigatória'),
  hoursPerWeek: z.number().min(0.5, 'Horas por semana deve ser maior que 0.5').max(60, 'Máximo 60 horas por semana'),
  standardWorkStart: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  standardWorkEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  standardBreakMinutes: z.number().min(0, 'Pausa não pode ser negativa').max(480, 'Máximo 8 horas de pausa'),
  useStandardSchedule: z.boolean()
});

const otPolicySchema = z.object({
  dayMultiplier: z.number().min(1, 'Multiplicador deve ser >= 1').max(5, 'Máximo 5x'),
  nightMultiplier: z.number().min(1, 'Multiplicador deve ser >= 1').max(5, 'Máximo 5x'),
  weekendMultiplier: z.number().min(1, 'Multiplicador deve ser >= 1').max(5, 'Máximo 5x'),
  holidayMultiplier: z.number().min(1, 'Multiplicador deve ser >= 1').max(5, 'Máximo 5x'),
  nightStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  nightEndTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  roundingMinutes: z.number().min(1, 'Mínimo 1 minuto').max(60, 'Máximo 60 minutos')
});

const mealAllowanceSchema = z.object({
  dailyAmount: z.number().min(0, 'Valor não pode ser negativo'),
  excludedMonths: z.array(z.number().min(1).max(12)).max(12, 'Máximo 12 meses')
});

const vacationSchema = z.object({
  periods: z.array(z.object({
    startDate: z.string().min(1, 'Data de início obrigatória'),
    endDate: z.string().min(1, 'Data de fim obrigatória'),
    description: z.string().optional()
  })).max(10, 'Máximo 10 períodos de férias')
});

const mileagePolicySchema = z.object({
  ratePerKm: z.number().min(0.01, 'Taxa deve ser maior que 0').max(2, 'Máximo €2/km'),
  monthlyCap: z.number().optional(),
  requireOrigin: z.boolean(),
  requireDestination: z.boolean(),
  requirePurpose: z.boolean()
});

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
      dayMultiplier: 1.25,
      nightMultiplier: 1.5,
      weekendMultiplier: 1.5,
      holidayMultiplier: 2.0,
      nightStartTime: '22:00',
      nightEndTime: '07:00',
      roundingMinutes: 15
    }
  });

  const mealAllowanceForm = useForm<MealAllowanceFormData>({
    resolver: zodResolver(mealAllowanceSchema),
    defaultValues: {
      dailyAmount: 6.0,
      excludedMonths: []
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
      ratePerKm: 0.36,
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
    if (!user) return;
    
    setIsSaving(true);
    try {
      await payrollService.upsertMealAllowanceConfig(user.id, data);
      
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
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Usar as novas funções do payrollService
      await payrollService.deleteVacationPeriods(user.id);
      
      if (data.periods.length > 0) {
        await payrollService.upsertVacationPeriods(user.id, data.periods);
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
      await payrollService.upsertMileagePolicy(user.id, data);
      
      toast({
        title: "Política de quilometragem atualizada",
        description: "As configurações foram guardadas.",
      });
    } catch (error) {
      console.error('Erro ao guardar política quilometragem:', error);
      toast({
        title: "Erro ao guardar",
        description: "Não foi possível atualizar a política.",
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
      // Carregar dados de todas as tabelas
      const [contractRes, otPolicyRes, mealAllowanceRes, vacationRes, mileagePolicyRes] = await Promise.all([
        payrollService.getActiveContract(user.id),
        payrollService.getActiveOTPolicy(user.id),
        payrollService.getMealAllowanceConfig(user.id),
        payrollService.getVacations(user.id),
        payrollService.getActiveMileagePolicy(user.id)
      ]);
      
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
          dayMultiplier: otPolicyRes.day_multiplier || 1.25,
          nightMultiplier: otPolicyRes.night_multiplier || 1.5,
          weekendMultiplier: otPolicyRes.weekend_multiplier || 1.5,
          holidayMultiplier: otPolicyRes.holiday_multiplier || 2.0,
          nightStartTime: otPolicyRes.night_start_time || '22:00',
          nightEndTime: otPolicyRes.night_end_time || '06:00',
          roundingMinutes: otPolicyRes.rounding_minutes || 15
        });
      }
      
      // Atualizar formulário de subsídio de alimentação
      if (mealAllowanceRes) {
        mealAllowanceForm.reset({
          dailyAmount: mealAllowanceRes.daily_amount || 0,
          excludedMonths: mealAllowanceRes.excluded_months || []
        });
      }
      
      // Atualizar formulário de férias
      if (vacationRes && vacationRes.length > 0) {
        const periods = vacationRes.map(period => ({
          startDate: period.start_date,
          endDate: period.end_date,
          description: period.description || ''
        }));
        vacationForm.reset({ periods });
      }
      
      // Atualizar formulário de política de quilometragem
      if (mileagePolicyRes) {
        mileagePolicyForm.reset({
          ratePerKm: mileagePolicyRes.rate_cents_per_km ? mileagePolicyRes.rate_cents_per_km / 100 : 0,
          monthlyCap: mileagePolicyRes.monthly_cap_cents ? mileagePolicyRes.monthly_cap_cents / 100 : undefined,
          requireOrigin: mileagePolicyRes.requires_receipt || false,
          requireDestination: false,
          requirePurpose: true
        });
      }
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
                      <Label htmlFor="dayMultiplier">Multiplicador Dia</Label>
                      <Input
                        id="dayMultiplier"
                        type="number"
                        step="0.01"
                        {...otPolicyForm.register('dayMultiplier', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Horas extra durante o dia</p>
                      {otPolicyForm.formState.errors.dayMultiplier && (
                        <p className="text-sm text-red-500">{otPolicyForm.formState.errors.dayMultiplier.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nightMultiplier">Multiplicador Noite</Label>
                      <Input
                        id="nightMultiplier"
                        type="number"
                        step="0.01"
                        {...otPolicyForm.register('nightMultiplier', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Horas extra durante a noite</p>
                      {otPolicyForm.formState.errors.nightMultiplier && (
                        <p className="text-sm text-red-500">{otPolicyForm.formState.errors.nightMultiplier.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weekendMultiplier">Multiplicador Fim de Semana</Label>
                      <Input
                        id="weekendMultiplier"
                        type="number"
                        step="0.01"
                        {...otPolicyForm.register('weekendMultiplier', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Sábados e domingos</p>
                      {otPolicyForm.formState.errors.weekendMultiplier && (
                        <p className="text-sm text-red-500">{otPolicyForm.formState.errors.weekendMultiplier.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="holidayMultiplier">Multiplicador Feriado</Label>
                      <Input
                        id="holidayMultiplier"
                        type="number"
                        step="0.01"
                        {...otPolicyForm.register('holidayMultiplier', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Feriados nacionais</p>
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
                  
                  <Button type="submit" disabled={isSaving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Guardando...' : 'Guardar Política'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Subsídio de Alimentação */}
          {activeSection === 'meal' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Subsídio de Alimentação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={mealAllowanceForm.handleSubmit(handleSaveMealAllowance)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dailyAmount">Valor Diário ({contractForm.watch('currency') || 'EUR'})</Label>
                    <Input
                      id="dailyAmount"
                      type="number"
                      step="0.01"
                      {...mealAllowanceForm.register('dailyAmount', { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">Valor pago por cada dia trabalhado</p>
                    {mealAllowanceForm.formState.errors.dailyAmount && (
                      <p className="text-sm text-red-500">{mealAllowanceForm.formState.errors.dailyAmount.message}</p>
                    )}
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

          {/* Férias */}
          {activeSection === 'vacation' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Períodos de Férias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={vacationForm.handleSubmit(handleSaveVacation)} className="space-y-4">
                  <div className="space-y-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ratePerKm">Taxa por Quilómetro ({contractForm.watch('currency') || 'EUR'})</Label>
                      <Input
                        id="ratePerKm"
                        type="number"
                        step="0.01"
                        {...mileagePolicyForm.register('ratePerKm', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">Valor pago por cada quilómetro percorrido</p>
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
                        {...mileagePolicyForm.register('monthlyCap', { valueAsNumber: true })}
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
                          {...mileagePolicyForm.register('requireOrigin')}
                        />
                        <Label htmlFor="requireOrigin">Exigir origem da viagem</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="requireDestination"
                          {...mileagePolicyForm.register('requireDestination')}
                        />
                        <Label htmlFor="requireDestination">Exigir destino da viagem</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="requirePurpose"
                          {...mileagePolicyForm.register('requirePurpose')}
                        />
                        <Label htmlFor="requirePurpose">Exigir motivo da viagem</Label>
                      </div>
                    </div>
                  </div>
                  
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