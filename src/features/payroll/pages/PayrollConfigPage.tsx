import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Separator } from '../../../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
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
  AlertTriangle,
  GraduationCap,
  Bell,
  MapPin,
  Plus,
  Award,
  FileText
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PayrollDeductionConfig } from '../components/PayrollDeductionConfig';
import { PayrollBonusConfig } from '../components/PayrollBonusConfig';
import { PayrollLeavesManager } from '../components/PayrollLeavesManager';

// Validation schemas
const contractSchema = z.object({
  baseSalary: z.number()
    .min(870, 'Salário não pode ser inferior ao salário mínimo nacional (€870 - 2025)')
    .max(50000, 'Salário máximo permitido: €50.000'),
  currency: z.string().min(1, 'Moeda é obrigatória'),
  hoursPerWeek: z.number().min(0.5, 'Horas por semana deve ser maior que 0.5').max(40, 'Máximo 40 horas por semana (limite legal)'),
  standardWorkStart: z.string().regex(/^\d{2}:\d{2}$/, 'Formato invalido (HH:MM)'),
  standardWorkEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Formato invalido (HH:MM)'),
  standardBreakMinutes: z.number().min(60, 'Mínimo 1 hora de pausa (60 min)').max(120, 'Máximo 2 horas de pausa (120 min)'),
  useStandardSchedule: z.boolean(),
  contractType: z.enum(['permanent', 'fixed_term'], { required_error: 'Tipo de contrato é obrigatório' }),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  durationMonths: z.number().min(1, 'Duração deve ser pelo menos 1 mês').max(36, 'Duração máxima: 36 meses').optional(),
  sector: z.enum(['private', 'public', 'nonprofit'], { required_error: 'Setor é obrigatório' }),
  // Campos obrigatórios adicionais
  professionalCategory: z.string().min(1, 'Categoria profissional é obrigatória'),
  workLocation: z.string().min(1, 'Local de trabalho é obrigatório'),
  probationPeriodMonths: z.number().min(0, 'Período experimental não pode ser negativo').max(6, 'Período experimental máximo: 6 meses').optional()
}).refine((data) => {
  if (data.contractType === 'fixed_term' && !data.durationMonths) {
    return false;
  }
  return true;
}, {
  message: 'Duração em meses é obrigatória para contratos a termo',
  path: ['durationMonths']
});

const otPolicySchema = z.object({
  enabled: z.boolean(),
  companySize: z.enum(['micro_small', 'medium_large'], { required_error: 'Tamanho da empresa é obrigatório' }),
  firstHourMultiplier: z.number().min(1.5, 'Mínimo 50% (1.5x)').max(2, 'Máximo 100% (2x)').default(1.5),
  subsequentHoursMultiplier: z.number().min(1.75, 'Mínimo 75% (1.75x)').max(2.5, 'Máximo 150% (2.5x)').default(1.75),
  weekendMultiplier: z.number().min(2, 'Mínimo 100% (2x)').max(3, 'Máximo 200% (3x)').default(2),
  holidayMultiplier: z.number().min(2, 'Mínimo 100% (2x)').max(3, 'Máximo 200% (3x)').default(2),
  nightStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato invalido (HH:MM)'),
  nightEndTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato invalido (HH:MM)'),
  roundingMinutes: z.number().min(1, 'Mínimo 1 minuto').max(60, 'Máximo 60 minutos'),
  dailyLimitHours: z.number().min(1, 'Mínimo 1 hora').max(2, 'Máximo 2 horas por dia').default(2),
  annualLimitHours: z.number().min(150, 'Mínimo 150 horas').max(175, 'Máximo 175 horas').default(150),
  weeklyLimitHours: z.number().min(48, 'Mínimo 48 horas').max(60, 'Máximo 60 horas').default(48)
}).refine((data) => {
  if (data.enabled) {
    const maxHours = data.companySize === 'micro_small' ? 175 : 150;
    return data.annualLimitHours <= maxHours;
  }
  return true;
}, {
  message: 'Limite anual excede o máximo permitido para o tamanho da empresa (175h micro/pequenas, 150h médias/grandes)',
  path: ['annualLimitHours']
})

const mealAllowanceSchema = z.object({
  dailyAmount: z.number().min(0, 'Valor não pode ser negativo'),
  excludedMonths: z.array(z.number().min(1).max(12)).max(12, 'Máximo 12 meses'),
  paymentMethod: z.enum(['cash', 'card'], { required_error: 'Método de pagamento é obrigatório' }),
  duodecimosEnabled: z.boolean().default(false)
}).refine((data) => {
  const maxCash = 6.00; // €6,00 para dinheiro (2025)
  const maxCard = 10.20; // €10,20 para cartão (2025)
  
  if (data.paymentMethod === 'cash' && data.dailyAmount > maxCash) {
    return false;
  }
  
  if (data.paymentMethod === 'card' && data.dailyAmount > maxCard) {
    return false;
  }
  
  return true;
}, {
  message: 'Valor excede o limite de isenção fiscal para o método de pagamento selecionado (€6,00 dinheiro / €10,20 cartão - 2025)',
  path: ['dailyAmount']
}).refine((data) => {
  // Se duodécimos estiver ativado e há meses excluídos, mostrar aviso
  if (data.duodecimosEnabled && data.excludedMonths.length > 0) {
    return true; // Permitir mas mostrar aviso
  }
  return true;
}, {
  message: 'Com duodécimos ativado, o subsídio será pago em todos os meses, incluindo os marcados como excluídos',
  path: ['duodecimosEnabled']
});

const vacationSchema = z.object({
  enabled: z.boolean(),
  annualVacationDays: z.number().min(22, 'Mínimo legal: 22 dias úteis').max(30, 'Máximo: 30 dias úteis').default(22),
  minimumConsecutiveDays: z.number().min(10, 'Mínimo legal: 10 dias úteis consecutivos').max(22, 'Máximo: 22 dias úteis').default(10),
  allowInterpolatedVacation: z.boolean().default(true),
  periods: z.array(z.object({
    startDate: z.string().min(1, 'Data de início obrigatória'),
    endDate: z.string().min(1, 'Data de fim obrigatória'),
    description: z.string().optional(),
    isConsecutive: z.boolean().default(false),
    totalDays: z.number().optional()
  })).max(10, 'Máximo 10 períodos de férias'),
  firstYearRules: z.object({
    daysPerMonth: z.number().min(2, 'Mínimo legal: 2 dias por mês').max(2, 'Máximo legal: 2 dias por mês').default(2),
    maxDaysFirstYear: z.number().min(20, 'Máximo legal: 20 dias úteis').max(20, 'Máximo legal: 20 dias úteis').default(20),
    minimumMonthsToEarn: z.number().min(6, 'Mínimo legal: 6 meses').max(6, 'Mínimo legal: 6 meses').default(6)
  }).default({
    daysPerMonth: 2,
    maxDaysFirstYear: 20,
    minimumMonthsToEarn: 6
  })
}).refine((data) => {
  // Validação: períodos de férias não podem sobrepor-se
  if (data.periods && data.periods.length > 1) {
    for (let i = 0; i < data.periods.length; i++) {
      for (let j = i + 1; j < data.periods.length; j++) {
        const period1Start = new Date(data.periods[i].startDate);
        const period1End = new Date(data.periods[i].endDate);
        const period2Start = new Date(data.periods[j].startDate);
        const period2End = new Date(data.periods[j].endDate);
        
        // Verificar sobreposição
        if ((period1Start <= period2End && period1End >= period2Start)) {
          return false;
        }
      }
    }
  }
  return true;
}, {
  message: 'Os períodos de férias não podem sobrepor-se',
  path: ['periods']
}).refine((data) => {
  // Validação: total de dias de férias não pode exceder o limite anual
  if (data.periods && data.periods.length > 0) {
    const totalDays = data.periods.reduce((sum, period) => {
      if (period.startDate && period.endDate) {
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return sum + diffDays;
      }
      return sum;
    }, 0);
    
    return totalDays <= data.annualVacationDays;
  }
  return true;
}, {
  message: 'O total de dias de férias marcados excede o limite anual',
  path: ['periods']
}).refine((data) => {
  // Validação: pelo menos um período consecutivo deve ter o mínimo de dias
  if (data.periods && data.periods.length > 0) {
    const hasMinimumConsecutive = data.periods.some(period => {
      if (period.startDate && period.endDate && period.isConsecutive) {
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays >= data.minimumConsecutiveDays;
      }
      return false;
    });
    
    // Se há períodos marcados, pelo menos um deve ser consecutivo com o mínimo
    return data.periods.length === 0 || hasMinimumConsecutive;
  }
  return true;
}, {
  message: `Pelo menos um período de férias deve ser consecutivo com o mínimo de dias obrigatório`,
  path: ['periods']
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
  if (data.enabled && !data.ratePerKm) {
    return false;
  }
  return true;
}, {
  message: "Taxa por quilómetro é obrigatória quando a política está ativada",
  path: ["ratePerKm"]
}).refine((data) => {
  if (data.enabled && (data.requireOrigin === undefined || data.requireDestination === undefined || data.requirePurpose === undefined)) {
    return false;
  }
  return true;
}, {
  message: "Configurações de campos obrigatórios devem ser definidas quando a política está ativada",
  path: ["requireOrigin"]
});

type ContractFormData = z.infer<typeof contractSchema>;
type OTPolicyFormData = z.infer<typeof otPolicySchema>;
type MealAllowanceFormData = z.infer<typeof mealAllowanceSchema>;
type VacationFormData = z.infer<typeof vacationSchema>;
type MileagePolicyFormData = z.infer<typeof mileagePolicySchema>;

const PayrollConfigPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State management
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('contract');
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [showCreateContractDialog, setShowCreateContractDialog] = useState(false);
  const [newContractName, setNewContractName] = useState('');
  
  // Form configurations
  const contractForm = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      baseSalary: 870,
      currency: 'EUR',
      hoursPerWeek: 40,
      standardWorkStart: '09:00',
      standardWorkEnd: '18:00',
      standardBreakMinutes: 60,
      useStandardSchedule: true,
      contractType: 'permanent',
      startDate: '',
      durationMonths: undefined,
      sector: 'private'
    }
  });
  
  const otPolicyForm = useForm<OTPolicyFormData>({
    resolver: zodResolver(otPolicySchema),
    defaultValues: {
      enabled: true,
      firstHourMultiplier: 1.5, // Legislação portuguesa: 50% sobre o valor normal
      subsequentHoursMultiplier: 1.75, // Legislação portuguesa: 75% sobre o valor normal
      weekendMultiplier: 2.0, // Legislação portuguesa: 100% sobre o valor normal
      holidayMultiplier: 2.0, // Legislação portuguesa: 100% sobre o valor normal
      nightStartTime: '22:00', // Período noturno: 22h às 7h
      nightEndTime: '07:00',
      roundingMinutes: 15, // Arredondamento a 15 minutos
      dailyLimitHours: 2, // Máximo 2 horas extras por dia
      annualLimitHours: 150, // Máximo 150 horas extras por ano
      weeklyLimitHours: 48 // Máximo 48 horas semanais (40h normais + 8h extras)
    }
  });
  
  const mealAllowanceForm = useForm<MealAllowanceFormData>({
    resolver: zodResolver(mealAllowanceSchema),
    defaultValues: {
      dailyAmount: 6.00,
      excludedMonths: [],
      paymentMethod: 'card'
    }
  });
  
  const vacationForm = useForm<VacationFormData>({
    resolver: zodResolver(vacationSchema),
    defaultValues: {
      enabled: true,
      annualVacationDays: 22,
      minimumConsecutiveDays: 10,
      allowInterpolatedVacation: true,
      periods: [],
      firstYearRules: {
        daysPerMonth: 2,
        maxDaysFirstYear: 20,
        minimumMonthsToEarn: 6
      }
    }
  });
  
  const mileagePolicyForm = useForm<MileagePolicyFormData>({
    resolver: zodResolver(mileagePolicySchema),
    defaultValues: {
      enabled: false,
      name: '',
      ratePerKm: 0.36,
      monthlyCap: 0,
      requireOrigin: true,
      requireDestination: true,
      requirePurpose: true
    }
  });
  
  // Load data function
  const loadData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Load contracts
      const contractsData = await payrollService.getContracts(user.id);
      setContracts(contractsData || []);
      
      // If there are contracts, select the first one
      if (contractsData && contractsData.length > 0) {
        const firstContract = contractsData[0];
        setSelectedContractId(firstContract.id);
        
        // Load contract data (use the already loaded contract)
        const contractData = firstContract;
        if (contractData) {
          contractForm.reset({
            baseSalary: (contractData.base_salary_cents || 87000) / 100, // Convert cents to euros
            currency: contractData.currency || 'EUR',
            hoursPerWeek: contractData.weekly_hours || 40,
            standardWorkStart: contractData.standard_work_start || '09:00',
            standardWorkEnd: contractData.standard_work_end || '18:00',
            standardBreakMinutes: contractData.standard_break_minutes || 60,
            useStandardSchedule: contractData.use_standard_schedule ?? true
          });
        }
        
        // Load other configurations
        if (firstContract.id) {
          await loadOtherConfigurations(firstContract.id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadOtherConfigurations = async (contractId: string) => {
    if (!contractId || contractId === 'undefined') {
      console.warn('Invalid contractId provided to loadOtherConfigurations:', contractId);
      return;
    }
    
    try {
      // Load OT Policy
      const otPolicy = await payrollService.getActiveOTPolicy(user.id);
      if (otPolicy) {
        otPolicyForm.reset(otPolicy);
      }
      
      // Load Meal Allowance
      const mealAllowance = await payrollService.getMealAllowanceConfig(user.id, contractId);
      if (mealAllowance) {
        mealAllowanceForm.reset(mealAllowance);
      }
      
      // Load Vacation
      const vacations = await payrollService.getVacations(user.id, contractId);
      if (vacations && vacations.length > 0) {
        vacationForm.reset(vacations[0]);
      }
      
      // Load Mileage Policy
      const mileagePolicy = await payrollService.getActiveMileagePolicy(user.id);
      if (mileagePolicy) {
        mileagePolicyForm.reset(mileagePolicy);
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
    }
  };
  
  // Save functions
  const handleSaveContract = async (data: any) => {
    if (!selectedContractId || selectedContractId === 'undefined') {
      toast({
        title: 'Erro',
        description: 'Nenhum contrato selecionado.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Map form data to API format
      const contractData: ContractFormData = {
        name: contracts.find(c => c.id === selectedContractId)?.name || 'Contrato Principal',
        base_salary_cents: Math.round(data.baseSalary * 100), // Convert euros to cents
        currency: data.currency,
        weekly_hours: data.hoursPerWeek,
        schedule_json: {
          standard_work_start: data.standardWorkStart,
          standard_work_end: data.standardWorkEnd,
          standard_break_minutes: data.standardBreakMinutes,
          use_standard_schedule: data.useStandardSchedule
        },
        meal_allowance_cents_per_day: 0, // Default value
         meal_on_worked_days: true, // Default value
         vacation_bonus_mode: 'monthly', // Valid value: monthly, december, off
         christmas_bonus_mode: 'monthly', // Valid value: monthly, december, off
         is_active: true
      };
      
      await payrollService.updateContract(selectedContractId, contractData);
      toast({
        title: 'Sucesso',
        description: 'Contrato atualizado com sucesso!'
      });
    } catch (error) {
      console.error('Error saving contract:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar contrato. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveOTPolicy = async (data: OTPolicyFormData) => {
    if (!selectedContractId || selectedContractId === 'undefined') {
      toast({
        title: 'Erro',
        description: 'Nenhum contrato selecionado.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSaving(true);
      await payrollService.updateOTPolicy(selectedContractId, data);
      toast({
        title: 'Sucesso',
        description: 'Política de horas extras atualizada com sucesso!'
      });
    } catch (error) {
      console.error('Error saving OT policy:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar política de horas extras. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveMealAllowance = async (data: MealAllowanceFormData) => {
    if (!selectedContractId || selectedContractId === 'undefined') {
      toast({
        title: 'Erro',
        description: 'Nenhum contrato selecionado.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSaving(true);
      await payrollService.updateMealAllowanceConfig(selectedContractId, data);
      toast({
        title: 'Sucesso',
        description: 'Subsídio de alimentação atualizado com sucesso!'
      });
    } catch (error) {
      console.error('Error saving meal allowance:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar subsídio de alimentação. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveVacation = async (data: VacationFormData) => {
    if (!selectedContractId || selectedContractId === 'undefined') {
      toast({
        title: 'Erro',
        description: 'Nenhum contrato selecionado.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSaving(true);
      await payrollService.updateVacation(selectedContractId, data);
      toast({
        title: 'Sucesso',
        description: 'Configuração de férias atualizada com sucesso!'
      });
    } catch (error) {
      console.error('Error saving vacation:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configuração de férias. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveMileagePolicy = async (data: MileagePolicyFormData) => {
    if (!selectedContractId || selectedContractId === 'undefined') {
      toast({
        title: 'Erro',
        description: 'Nenhum contrato selecionado.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSaving(true);
      await payrollService.updateMileagePolicy(selectedContractId, data);
      toast({
        title: 'Sucesso',
        description: 'Política de quilometragem atualizada com sucesso!'
      });
    } catch (error) {
      console.error('Error saving mileage policy:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar política de quilometragem. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleContractChange = async (contractId: string) => {
    if (!contractId || contractId === 'undefined' || contractId.trim() === '') {
      console.warn('Invalid contractId provided to handleContractChange:', contractId);
      return;
    }
    
    setSelectedContractId(contractId);
    await loadOtherConfigurations(contractId);
    
    // Find contract data from already loaded contracts
    const contractData = contracts.find(contract => contract.id === contractId);
    if (contractData) {
      contractForm.reset({
        baseSalary: (contractData.base_salary_cents || 87000) / 100, // Convert cents to euros
        currency: contractData.currency || 'EUR',
        hoursPerWeek: contractData.weekly_hours || 40,
        standardWorkStart: contractData.standard_work_start || '09:00',
        standardWorkEnd: contractData.standard_work_end || '18:00',
        standardBreakMinutes: contractData.standard_break_minutes || 60,
        useStandardSchedule: contractData.use_standard_schedule ?? true
      });
    }
  };
  
  const handleCreateContract = async () => {
    if (!newContractName.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome do contrato é obrigatório.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Create contract with basic default data
      const contractData = {
        name: newContractName.trim(),
        baseSalary: 870,
        currency: 'EUR',
        hoursPerWeek: 40,
        standardWorkStart: '09:00',
        standardWorkEnd: '18:00',
        standardBreakMinutes: 60,
        useStandardSchedule: true,
        isActive: true
      };
      
      const newContract = await payrollService.createContract(contractData);
      
      // Update contracts list
      const updatedContracts = await payrollService.getContracts(user.id);
        setContracts(updatedContracts || []);
      
      // Select the new contract
      setSelectedContractId(newContract.id);
      contractForm.reset(contractData);
      
      // Close dialog and reset form
      setShowCreateContractDialog(false);
      setNewContractName('');
      
      toast({
        title: 'Sucesso',
        description: 'Contrato criado com sucesso!'
      });
    } catch (error) {
      console.error('Error creating contract:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar contrato. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
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
  
  // Configuration sections
  const sections = [
    { id: 'contract', label: 'Contrato Base', icon: Settings },
    { id: 'overtime', label: 'Horas Extras', icon: Clock },
    { id: 'meal', label: 'Subsídio Alimentação', icon: Utensils },
    { id: 'vacation', label: 'Férias', icon: Calendar },
    { id: 'leaves', label: 'Licenças Especiais', icon: FileText },
    { id: 'mileage', label: 'Quilometragem', icon: Car },
    { id: 'bonus', label: 'Bónus e Prémios', icon: Award },
    { id: 'deductions', label: 'Descontos', icon: Percent }
  ];
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Configuração de Folha de Pagamento</h1>
      </div>
      
      {/* Contract Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Seleção de Contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="contract-select">Contrato Ativo</Label>
                <Select value={selectedContractId || ''} onValueChange={handleContractChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.name} {contract.isActive ? '(Ativo)' : '(Inativo)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setShowCreateContractDialog(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo Contrato
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum contrato encontrado. Crie o seu primeiro contrato para começar.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => setShowCreateContractDialog(true)}
                className="mt-4 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Criar Primeiro Contrato
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedContractId && (
        <>
          {/* Navigation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <Button
                      key={section.id}
                      variant={activeSection === section.id ? 'default' : 'outline'}
                      onClick={() => setActiveSection(section.id)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Contract Configuration */}
          {activeSection === 'contract' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuração do Contrato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={contractForm.handleSubmit(handleSaveContract)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="baseSalary">Salário Base (€)</Label>
                      <Input
                        id="baseSalary"
                        type="number"
                        step="0.01"
                        {...contractForm.register('baseSalary', { valueAsNumber: true })}
                      />
                      {contractForm.formState.errors.baseSalary && (
                        <p className="text-sm text-red-500 mt-1">
                          {contractForm.formState.errors.baseSalary.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="currency">Moeda</Label>
                      <Select value={contractForm.watch('currency')} onValueChange={(value) => contractForm.setValue('currency', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                      {contractForm.formState.errors.currency && (
                        <p className="text-sm text-red-500 mt-1">
                          {contractForm.formState.errors.currency.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="hoursPerWeek">Horas por Semana</Label>
                      <Input
                        id="hoursPerWeek"
                        type="number"
                        step="0.5"
                        {...contractForm.register('hoursPerWeek', { valueAsNumber: true })}
                      />
                      {contractForm.formState.errors.hoursPerWeek && (
                        <p className="text-sm text-red-500 mt-1">
                          {contractForm.formState.errors.hoursPerWeek.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="useStandardSchedule"
                        checked={contractForm.watch('useStandardSchedule')}
                        onCheckedChange={(checked) => contractForm.setValue('useStandardSchedule', checked)}
                      />
                      <Label htmlFor="useStandardSchedule">Usar Horário Padrão</Label>
                    </div>
                  </div>
                  
                  {contractForm.watch('useStandardSchedule') && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="standardWorkStart">Início do Trabalho</Label>
                        <Input
                          id="standardWorkStart"
                          type="time"
                          {...contractForm.register('standardWorkStart')}
                        />
                        {contractForm.formState.errors.standardWorkStart && (
                          <p className="text-sm text-red-500 mt-1">
                            {contractForm.formState.errors.standardWorkStart.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="standardWorkEnd">Fim do Trabalho</Label>
                        <Input
                          id="standardWorkEnd"
                          type="time"
                          {...contractForm.register('standardWorkEnd')}
                        />
                        {contractForm.formState.errors.standardWorkEnd && (
                          <p className="text-sm text-red-500 mt-1">
                            {contractForm.formState.errors.standardWorkEnd.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="standardBreakMinutes">Pausa (minutos)</Label>
                        <Input
                          id="standardBreakMinutes"
                          type="number"
                          {...contractForm.register('standardBreakMinutes', { valueAsNumber: true })}
                        />
                        {contractForm.formState.errors.standardBreakMinutes && (
                          <p className="text-sm text-red-500 mt-1">
                            {contractForm.formState.errors.standardBreakMinutes.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Contract Type and Duration */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Tipo e Duração do Contrato</h3>
                    
                    {/* Linha 1: Tipo de Contrato e Setor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="contractType">Tipo de Contrato</Label>
                        <Select 
                          value={contractForm.watch('contractType')} 
                          onValueChange={(value) => contractForm.setValue('contractType', value as 'permanent' | 'fixed_term')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de contrato" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="permanent">Sem Termo</SelectItem>
                            <SelectItem value="fixed_term">A Termo Certo</SelectItem>
                          </SelectContent>
                        </Select>
                        {contractForm.formState.errors.contractType && (
                          <p className="text-sm text-red-500 mt-1">
                            {contractForm.formState.errors.contractType.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="sector">Setor</Label>
                        <Select 
                          value={contractForm.watch('sector')} 
                          onValueChange={(value) => contractForm.setValue('sector', value as 'private' | 'public' | 'nonprofit')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o setor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="private">Privado</SelectItem>
                            <SelectItem value="public">Público</SelectItem>
                            <SelectItem value="nonprofit">Sem Fins Lucrativos</SelectItem>
                          </SelectContent>
                        </Select>
                        {contractForm.formState.errors.sector && (
                          <p className="text-sm text-red-500 mt-1">
                            {contractForm.formState.errors.sector.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Linha 2: Data de Início e Categoria Profissional */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="startDate">Data de Início</Label>
                        <Input
                          id="startDate"
                          type="date"
                          {...contractForm.register('startDate')}
                        />
                        {contractForm.formState.errors.startDate && (
                          <p className="text-sm text-red-500 mt-1">
                            {contractForm.formState.errors.startDate.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="professionalCategory">Categoria Profissional</Label>
                        <Input
                          id="professionalCategory"
                          type="text"
                          placeholder="Ex: Técnico Superior, Administrativo, etc."
                          {...contractForm.register('professionalCategory')}
                        />
                        {contractForm.formState.errors.professionalCategory && (
                          <p className="text-sm text-red-500 mt-1">
                            {contractForm.formState.errors.professionalCategory.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Linha 3: Local de Trabalho e Período Experimental */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="workLocation">Local de Trabalho</Label>
                        <Input
                          id="workLocation"
                          type="text"
                          placeholder="Ex: Lisboa, Porto, Remoto, etc."
                          {...contractForm.register('workLocation')}
                        />
                        {contractForm.formState.errors.workLocation && (
                          <p className="text-sm text-red-500 mt-1">
                            {contractForm.formState.errors.workLocation.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="probationPeriodMonths">Período Experimental (meses)</Label>
                        <Input
                          id="probationPeriodMonths"
                          type="number"
                          min="0"
                          max="6"
                          placeholder="0-6 meses (opcional)"
                          {...contractForm.register('probationPeriodMonths', { valueAsNumber: true })}
                        />
                        {contractForm.formState.errors.probationPeriodMonths && (
                          <p className="text-sm text-red-500 mt-1">
                            {contractForm.formState.errors.probationPeriodMonths.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Linha 4: Duração (apenas para contratos a termo) */}
                    {contractForm.watch('contractType') === 'fixed_term' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="durationMonths">Duração (meses)</Label>
                          <Input
                            id="durationMonths"
                            type="number"
                            min="1"
                            max="36"
                            placeholder="Ex: 12"
                            {...contractForm.register('durationMonths', { valueAsNumber: true })}
                          />
                          {contractForm.formState.errors.durationMonths && (
                            <p className="text-sm text-red-500 mt-1">
                              {contractForm.formState.errors.durationMonths.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label>Data de Fim (calculada)</Label>
                          <div className="p-2 bg-gray-50 rounded border text-sm">
                            {(() => {
                              const startDate = contractForm.watch('startDate');
                              const duration = contractForm.watch('durationMonths');
                              
                              if (startDate && duration) {
                                const start = new Date(startDate);
                                const end = new Date(start);
                                end.setMonth(end.getMonth() + duration);
                                return end.toLocaleDateString('pt', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                });
                              }
                              
                              return 'Preencha a data de inicio e duracao';
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                    {isSaving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
                    Salvar Contrato
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          
          {/* Overtime Policy Configuration */}
          {activeSection === 'overtime' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Política de Horas Extras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={otPolicyForm.handleSubmit(handleSaveOTPolicy)} className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="otEnabled"
                      checked={otPolicyForm.watch('enabled')}
                      onCheckedChange={(checked) => otPolicyForm.setValue('enabled', checked)}
                    />
                    <Label htmlFor="otEnabled">Ativar Política de Horas Extras</Label>
                  </div>
                  
                  {otPolicyForm.watch('enabled') && (
                    <div className="space-y-6">
                      {/* Tamanho da Empresa */}
                      <div>
                        <Label htmlFor="companySize">Tamanho da Empresa</Label>
                        <Select 
                          value={otPolicyForm.watch('companySize')} 
                          onValueChange={(value) => otPolicyForm.setValue('companySize', value as 'micro_small' | 'medium_large')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tamanho da empresa" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="micro_small">Micro/Pequena Empresa (até 50 trabalhadores) - Limite: 175h/ano</SelectItem>
                            <SelectItem value="medium_large">Média/Grande Empresa (mais de 50 trabalhadores) - Limite: 150h/ano</SelectItem>
                          </SelectContent>
                        </Select>
                        {otPolicyForm.formState.errors.companySize && (
                          <p className="text-sm text-red-500 mt-1">
                            {otPolicyForm.formState.errors.companySize.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          O limite anual de horas extras varia conforme o tamanho da empresa (Código do Trabalho)
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="firstHourMultiplier">Multiplicador Primeira Hora</Label>
                          <Input
                            id="firstHourMultiplier"
                            type="number"
                            step="0.25"
                            {...otPolicyForm.register('firstHourMultiplier', { valueAsNumber: true })}
                          />
                          {otPolicyForm.formState.errors.firstHourMultiplier && (
                            <p className="text-sm text-red-500 mt-1">
                              {otPolicyForm.formState.errors.firstHourMultiplier.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="subsequentHoursMultiplier">Multiplicador Horas Seguintes</Label>
                          <Input
                            id="subsequentHoursMultiplier"
                            type="number"
                            step="0.25"
                            {...otPolicyForm.register('subsequentHoursMultiplier', { valueAsNumber: true })}
                          />
                          {otPolicyForm.formState.errors.subsequentHoursMultiplier && (
                            <p className="text-sm text-red-500 mt-1">
                              {otPolicyForm.formState.errors.subsequentHoursMultiplier.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="weekendMultiplier">Multiplicador Fins de Semana</Label>
                          <Input
                            id="weekendMultiplier"
                            type="number"
                            step="0.25"
                            {...otPolicyForm.register('weekendMultiplier', { valueAsNumber: true })}
                          />
                          {otPolicyForm.formState.errors.weekendMultiplier && (
                            <p className="text-sm text-red-500 mt-1">
                              {otPolicyForm.formState.errors.weekendMultiplier.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="holidayMultiplier">Multiplicador Feriados</Label>
                          <Input
                            id="holidayMultiplier"
                            type="number"
                            step="0.25"
                            {...otPolicyForm.register('holidayMultiplier', { valueAsNumber: true })}
                          />
                          {otPolicyForm.formState.errors.holidayMultiplier && (
                            <p className="text-sm text-red-500 mt-1">
                              {otPolicyForm.formState.errors.holidayMultiplier.message}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="nightStartTime">Início Período Noturno</Label>
                          <Input
                            id="nightStartTime"
                            type="time"
                            {...otPolicyForm.register('nightStartTime')}
                          />
                          {otPolicyForm.formState.errors.nightStartTime && (
                            <p className="text-sm text-red-500 mt-1">
                              {otPolicyForm.formState.errors.nightStartTime.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="nightEndTime">Fim Período Noturno</Label>
                          <Input
                            id="nightEndTime"
                            type="time"
                            {...otPolicyForm.register('nightEndTime')}
                          />
                          {otPolicyForm.formState.errors.nightEndTime && (
                            <p className="text-sm text-red-500 mt-1">
                              {otPolicyForm.formState.errors.nightEndTime.message}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                          <Label htmlFor="roundingMinutes">Arredondamento (min)</Label>
                          <Input
                            id="roundingMinutes"
                            type="number"
                            {...otPolicyForm.register('roundingMinutes', { valueAsNumber: true })}
                          />
                          {otPolicyForm.formState.errors.roundingMinutes && (
                            <p className="text-sm text-red-500 mt-1">
                              {otPolicyForm.formState.errors.roundingMinutes.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="dailyLimitHours">Limite Diário (h)</Label>
                          <Input
                            id="dailyLimitHours"
                            type="number"
                            step="0.5"
                            {...otPolicyForm.register('dailyLimitHours', { valueAsNumber: true })}
                          />
                          {otPolicyForm.formState.errors.dailyLimitHours && (
                            <p className="text-sm text-red-500 mt-1">
                              {otPolicyForm.formState.errors.dailyLimitHours.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="weeklyLimitHours">Limite Semanal (h)</Label>
                          <Input
                            id="weeklyLimitHours"
                            type="number"
                            {...otPolicyForm.register('weeklyLimitHours', { valueAsNumber: true })}
                          />
                          {otPolicyForm.formState.errors.weeklyLimitHours && (
                            <p className="text-sm text-red-500 mt-1">
                              {otPolicyForm.formState.errors.weeklyLimitHours.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="annualLimitHours">
                            Limite Anual (h) - {otPolicyForm.watch('companySize') === 'micro_small' ? 'Máx: 175h' : 'Máx: 150h'}
                          </Label>
                          <Input
                            id="annualLimitHours"
                            type="number"
                            placeholder={otPolicyForm.watch('companySize') === 'micro_small' ? '175' : '150'}
                            {...otPolicyForm.register('annualLimitHours', { valueAsNumber: true })}
                          />
                          {otPolicyForm.formState.errors.annualLimitHours && (
                            <p className="text-sm text-red-500 mt-1">
                              {otPolicyForm.formState.errors.annualLimitHours.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {otPolicyForm.watch('companySize') === 'micro_small' 
                              ? 'Micro/Pequenas empresas: máximo 175 horas/ano'
                              : 'Médias/Grandes empresas: máximo 150 horas/ano'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                    {isSaving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
                    Salvar Política de Horas Extras
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          
          {/* Meal Allowance Configuration */}
          {activeSection === 'meal' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Subsídio de Alimentação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={mealAllowanceForm.handleSubmit(handleSaveMealAllowance)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="dailyAmount">Valor Diário (€)</Label>
                      <Input
                        id="dailyAmount"
                        type="number"
                        step="0.01"
                        {...mealAllowanceForm.register('dailyAmount', { valueAsNumber: true })}
                      />
                      {mealAllowanceForm.formState.errors.dailyAmount && (
                        <p className="text-sm text-red-500 mt-1">
                          {mealAllowanceForm.formState.errors.dailyAmount.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                      <Select 
                        value={mealAllowanceForm.watch('paymentMethod')} 
                        onValueChange={(value) => mealAllowanceForm.setValue('paymentMethod', value as 'cash' | 'card')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Dinheiro (máx. €6,00 - 2025)</SelectItem>
                          <SelectItem value="card">Cartão (máx. €10,20 - 2025)</SelectItem>
                        </SelectContent>
                      </Select>
                      {mealAllowanceForm.formState.errors.paymentMethod && (
                        <p className="text-sm text-red-500 mt-1">
                          {mealAllowanceForm.formState.errors.paymentMethod.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="duodecimosEnabled"
                        checked={mealAllowanceForm.watch('duodecimosEnabled')}
                        onCheckedChange={(checked) => mealAllowanceForm.setValue('duodecimosEnabled', checked as boolean)}
                      />
                      <Label htmlFor="duodecimosEnabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Pagamento em Duodécimos
                      </Label>
                    </div>
                    
                    {mealAllowanceForm.watch('duodecimosEnabled') && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Duodécimos:</strong> O subsídio será distribuído ao longo de 12 meses, 
                          incluindo períodos de férias. Isto permite um pagamento mais uniforme durante o ano.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {mealAllowanceForm.formState.errors.duodecimosEnabled && (
                       <p className="text-sm text-amber-600 mt-1">
                         {mealAllowanceForm.formState.errors.duodecimosEnabled.message}
                       </p>
                     )}
                  </div>
                  
                  <div>
                    <Label>Meses Excluídos</Label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
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
                  </div>
                  
                  <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                    {isSaving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
                    Salvar Subsídio de Alimentação
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          
          {/* Vacation Configuration */}
          {activeSection === 'vacation' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Configuração de Férias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={vacationForm.handleSubmit(handleSaveVacation)} className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="vacationEnabled"
                      checked={vacationForm.watch('enabled')}
                      onCheckedChange={(checked) => vacationForm.setValue('enabled', checked)}
                    />
                    <Label htmlFor="vacationEnabled">Ativar Gestão de Férias</Label>
                  </div>
                  
                  {vacationForm.watch('enabled') && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <Label htmlFor="annualVacationDays">Dias de Férias Anuais</Label>
                          <Input
                            id="annualVacationDays"
                            type="number"
                            {...vacationForm.register('annualVacationDays', { valueAsNumber: true })}
                          />
                          {vacationForm.formState.errors.annualVacationDays && (
                            <p className="text-sm text-red-500 mt-1">
                              {vacationForm.formState.errors.annualVacationDays.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="minimumConsecutiveDays">Mínimo Dias Consecutivos</Label>
                          <Input
                            id="minimumConsecutiveDays"
                            type="number"
                            {...vacationForm.register('minimumConsecutiveDays', { valueAsNumber: true })}
                          />
                          {vacationForm.formState.errors.minimumConsecutiveDays && (
                            <p className="text-sm text-red-500 mt-1">
                              {vacationForm.formState.errors.minimumConsecutiveDays.message}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="allowInterpolatedVacation"
                            checked={vacationForm.watch('allowInterpolatedVacation')}
                            onCheckedChange={(checked) => vacationForm.setValue('allowInterpolatedVacation', checked)}
                          />
                          <Label htmlFor="allowInterpolatedVacation">Permitir Férias Interpoladas</Label>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium">Períodos de Férias</h3>
                          <Button type="button" onClick={addVacationPeriod} variant="outline" size="sm">
                            Adicionar Período
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          {vacationForm.watch('periods')?.map((period, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                              <div>
                                <Label htmlFor={`period-start-${index}`}>Data Início</Label>
                                <Input
                                  id={`period-start-${index}`}
                                  type="date"
                                  {...vacationForm.register(`periods.${index}.startDate`)}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor={`period-end-${index}`}>Data Fim</Label>
                                <Input
                                  id={`period-end-${index}`}
                                  type="date"
                                  {...vacationForm.register(`periods.${index}.endDate`)}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor={`period-description-${index}`}>Descrição</Label>
                                <Input
                                  id={`period-description-${index}`}
                                  placeholder="Opcional"
                                  {...vacationForm.register(`periods.${index}.description`)}
                                />
                              </div>
                              
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeVacationPeriod(index)}
                                >
                                  Remover
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                    {isSaving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
                    Salvar Configuração de Férias
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          
          {/* Leaves Management */}
          {activeSection === 'leaves' && (
            <PayrollLeavesManager contractId={selectedContractId} />
          )}
          
          {/* Mileage Policy Configuration */}
          {activeSection === 'mileage' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Política de Quilometragem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={mileagePolicyForm.handleSubmit(handleSaveMileagePolicy)} className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="mileageEnabled"
                      checked={mileagePolicyForm.watch('enabled')}
                      onCheckedChange={(checked) => mileagePolicyForm.setValue('enabled', checked)}
                    />
                    <Label htmlFor="mileageEnabled">Ativar Política de Quilometragem</Label>
                  </div>
                  
                  {mileagePolicyForm.watch('enabled') && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="mileageName">Nome da Política</Label>
                          <Input
                            id="mileageName"
                            placeholder="Ex: Política Padrão"
                            {...mileagePolicyForm.register('name')}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="ratePerKm">Taxa por Quilómetro (€)</Label>
                          <Input
                            id="ratePerKm"
                            type="number"
                            step="0.01"
                            {...mileagePolicyForm.register('ratePerKm', { valueAsNumber: true })}
                          />
                          {mileagePolicyForm.formState.errors.ratePerKm && (
                            <p className="text-sm text-red-500 mt-1">
                              {mileagePolicyForm.formState.errors.ratePerKm.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="monthlyCap">Limite Mensal (€)</Label>
                          <Input
                            id="monthlyCap"
                            type="number"
                            step="0.01"
                            placeholder="0 = sem limite"
                            {...mileagePolicyForm.register('monthlyCap', { valueAsNumber: true })}
                          />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">Campos Obrigatórios</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="requireOrigin"
                              checked={mileagePolicyForm.watch('requireOrigin')}
                              onCheckedChange={(checked) => mileagePolicyForm.setValue('requireOrigin', checked)}
                            />
                            <Label htmlFor="requireOrigin">Origem Obrigatória</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="requireDestination"
                              checked={mileagePolicyForm.watch('requireDestination')}
                              onCheckedChange={(checked) => mileagePolicyForm.setValue('requireDestination', checked)}
                            />
                            <Label htmlFor="requireDestination">Destino Obrigatório</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="requirePurpose"
                              checked={mileagePolicyForm.watch('requirePurpose')}
                              onCheckedChange={(checked) => mileagePolicyForm.setValue('requirePurpose', checked)}
                            />
                            <Label htmlFor="requirePurpose">Propósito Obrigatório</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                    {isSaving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
                    Salvar Política de Quilometragem
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          
          {/* Bonus Configuration */}
          {activeSection === 'bonus' && (
            <div className="space-y-6">
              <Tabs defaultValue="vacation" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="vacation">Subsídio de Férias</TabsTrigger>
                  <TabsTrigger value="christmas">Subsídio de Natal</TabsTrigger>
                  <TabsTrigger value="performance">Prémios de Produtividade</TabsTrigger>
                  <TabsTrigger value="custom">Outros Prémios</TabsTrigger>
                </TabsList>
                
                <TabsContent value="vacation" className="space-y-6">
                  <PayrollBonusConfig bonusType="mandatory" contractId={selectedContractId} specificSubsidy="vacation" />
                </TabsContent>
                
                <TabsContent value="christmas" className="space-y-6">
                  <PayrollBonusConfig bonusType="mandatory" contractId={selectedContractId} specificSubsidy="christmas" />
                </TabsContent>
                
                <TabsContent value="performance" className="space-y-6">
                  <PayrollBonusConfig bonusType="performance" contractId={selectedContractId} />
                </TabsContent>
                
                <TabsContent value="custom" className="space-y-6">
                  <PayrollBonusConfig bonusType="custom" contractId={selectedContractId} />
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          {/* Deductions Configuration */}
          {activeSection === 'deductions' && (
            <PayrollDeductionConfig contractId={selectedContractId} />
          )}
        </>
      )}
      
      {/* Create Contract Dialog */}
      <Dialog open={showCreateContractDialog} onOpenChange={setShowCreateContractDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Contrato</DialogTitle>
            <DialogDescription>
              Insira o nome para o novo contrato. As configurações básicas serão aplicadas automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="contractName">Nome do Contrato</Label>
              <Input
                id="contractName"
                value={newContractName}
                onChange={(e) => setNewContractName(e.target.value)}
                placeholder="Ex: Contrato Principal"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateContractDialog(false);
                setNewContractName('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateContract}
              disabled={isSaving || !newContractName.trim()}
            >
              {isSaving ? <LoadingSpinner size="sm" /> : 'Criar Contrato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollConfigPage;