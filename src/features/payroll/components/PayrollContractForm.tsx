import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import {
  PayrollContract,
  ContractFormData
} from '../types';
import { payrollService } from '../services/payrollService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';


interface PayrollContractFormProps {
  contract?: PayrollContract;
  onSave?: (contract: PayrollContract) => void;
  onCancel?: () => void;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Segunda-feira' },
  { value: 'tuesday', label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday', label: 'Quinta-feira' },
  { value: 'friday', label: 'Sexta-feira' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' }
];

const VACATION_BONUS_OPTIONS = [
  { value: 'off', label: 'Sem subsídio de férias' },
  { value: 'monthly', label: 'Subsídio mensal' },
  { value: 'june', label: 'Subsídio em junho' },
  { value: 'december', label: 'Subsídio em dezembro' }
];

const CHRISTMAS_BONUS_OPTIONS = [
  { value: 'off', label: 'Sem subsídio de Natal' },
  { value: 'monthly', label: 'Subsídio mensal' },
  { value: 'december', label: 'Subsídio em dezembro' }
];

export function PayrollContractForm({ contract, onSave, onCancel }: PayrollContractFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ContractFormData>({
    name: '',
    base_salary_cents: 0,
    schedule_json: {},
    meal_allowance_cents_per_day: 0,
    meal_on_worked_days: true,
    vacation_bonus_mode: 'monthly',
    christmas_bonus_mode: 'monthly',
    is_active: true
  });

  // Estados temporários para entrada de valores como strings
  const [baseSalaryInput, setBaseSalaryInput] = useState('');
  const [mealAllowanceInput, setMealAllowanceInput] = useState('');

  useEffect(() => {
    if (contract) {
      setFormData({
        name: contract.name,
        base_salary_cents: contract.base_salary_cents,
        schedule_json: contract.schedule_json || {},
        meal_allowance_cents_per_day: contract.meal_allowance_cents_per_day,
        meal_on_worked_days: contract.meal_on_worked_days,
        vacation_bonus_mode: contract.vacation_bonus_mode,
        christmas_bonus_mode: contract.christmas_bonus_mode,
        is_active: contract.is_active
      });
      
      // Inicializar valores de entrada como strings
      setBaseSalaryInput(contract.base_salary_cents > 0 ? (contract.base_salary_cents / 100).toString().replace('.', ',') : '');
      setMealAllowanceInput(contract.meal_allowance_cents_per_day > 0 ? (contract.meal_allowance_cents_per_day / 100).toString().replace('.', ',') : '');
    }
  }, [contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    
    setLoading(true);

    try {
      let savedContract: PayrollContract;
      
      if (contract?.id) {
        savedContract = await payrollService.updateContract(contract.id, formData);
        toast({
          title: 'Contrato atualizado',
          description: 'O contrato foi atualizado com sucesso.'
        });
      } else {
        savedContract = await payrollService.createContract(user.id, formData);
        toast({
          title: 'Contrato criado',
          description: 'O novo contrato foi criado com sucesso.'
        });
      }

      onSave?.(savedContract);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao salvar o contrato.';
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      
      console.error('Error saving contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWorkSchedule = (day: string, field: 'start' | 'end' | 'enabled' | 'break_minutes', value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      schedule_json: {
        ...prev.schedule_json,
        [day]: {
          ...prev.schedule_json[day],
          [field]: value
        }
      }
    }));
  };

  // Função para formatar valores monetários para exibição (simples)
  const formatCurrency = (cents: number): string => {
    if (cents === 0) return '';
    const euros = cents / 100;
    return euros.toString().replace('.', ',');
  };

  // Função para converter string para centavos (simples como AccountForm)
  const parseCurrency = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    
    // Substituir vírgula por ponto e remover caracteres não numéricos (exceto ponto e sinal negativo)
    const numericValue = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    const parsedValue = parseFloat(numericValue);
    
    return isNaN(parsedValue) ? 0 : Math.round(parsedValue * 100);
  };

  const handleBaseSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Permitir valores vazios, negativos, positivos e vírgula/ponto
    if (value === '' || value === '-' || /^-?\d*[,.]?\d*$/.test(value)) {
      setBaseSalaryInput(value);
      
      // Converter para centavos apenas se for um número válido
      if (value === '' || value === '-') {
        setFormData(prev => ({ ...prev, base_salary_cents: 0 }));
      } else {
        const numericValue = value.replace(',', '.');
        const parsedValue = parseFloat(numericValue);
        if (!isNaN(parsedValue)) {
          setFormData(prev => ({ ...prev, base_salary_cents: Math.round(parsedValue * 100) }));
        }
      }
    }
  };

  const handleMealAllowanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Permitir valores vazios, negativos, positivos e vírgula/ponto
    if (value === '' || value === '-' || /^-?\d*[,.]?\d*$/.test(value)) {
      setMealAllowanceInput(value);
      
      // Converter para centavos apenas se for um número válido
      if (value === '' || value === '-') {
        setFormData(prev => ({ ...prev, meal_allowance_cents_per_day: 0 }));
      } else {
        const numericValue = value.replace(',', '.');
        const parsedValue = parseFloat(numericValue);
        if (!isNaN(parsedValue)) {
          setFormData(prev => ({ ...prev, meal_allowance_cents_per_day: Math.round(parsedValue * 100) }));
        }
      }
    }
  };



  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {contract ? 'Editar Contrato' : 'Novo Contrato'}
        </CardTitle>
        <CardDescription>
          Configure os detalhes do contrato de trabalho, incluindo salário base, horários e subsídios.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Funcionário</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
                required
                autoComplete="name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="is_active">Contrato Ativo</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>

          {/* Valores Monetários */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_salary">Salário Base (€)</Label>
              <Input
                id="base_salary"
                type="text"
                value={baseSalaryInput}
                onChange={handleBaseSalaryChange}
                placeholder="0,00"
                required
                autoComplete="off"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="meal_allowance">Subsídio de Refeição por Dia (€)</Label>
              <div className="space-y-2">
                <Input
                  id="meal_allowance"
                  type="text"
                  value={mealAllowanceInput}
                  onChange={handleMealAllowanceChange}
                  placeholder="0,00"
                  autoComplete="off"
                />
                <div className="flex items-center space-x-2">
                  <Switch
                    id="meal_on_worked_days"
                    checked={formData.meal_on_worked_days}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, meal_on_worked_days: checked }))}
                  />
                  <Label htmlFor="meal_on_worked_days" className="text-sm">
                    Apenas em dias trabalhados
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Subsídios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vacation_bonus_mode">Subsídio de Férias</Label>
              <Select
                value={formData.vacation_bonus_mode}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vacation_bonus_mode: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de subsídio" />
                </SelectTrigger>
                <SelectContent>
                  {VACATION_BONUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="christmas_bonus_mode">Subsídio de Natal</Label>
              <Select
                value={formData.christmas_bonus_mode}
                onValueChange={(value) => setFormData(prev => ({ ...prev, christmas_bonus_mode: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de subsídio" />
                </SelectTrigger>
                <SelectContent>
                  {CHRISTMAS_BONUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Horário de Trabalho */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Horário de Trabalho</Label>
            <div className="grid gap-3">
              {DAYS_OF_WEEK.map(({ value, label }) => {
                const daySchedule = formData.schedule_json[value] || { enabled: false, start: '09:00', end: '18:00', break_minutes: 60 };
                
                return (
                  <div key={value} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 min-w-[140px]">
                      <Switch
                        checked={daySchedule.enabled || false}
                        onCheckedChange={(checked) => updateWorkSchedule(value, 'enabled', checked)}
                      />
                      <Label className="text-sm">{label}</Label>
                    </div>
                    
                    {daySchedule.enabled && (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="time"
                          value={daySchedule.start || '09:00'}
                          onChange={(e) => updateWorkSchedule(value, 'start', e.target.value)}
                          className="w-28"
                        />
                        <span className="text-sm text-muted-foreground">às</span>
                        <Input
                          type="time"
                          value={daySchedule.end || '18:00'}
                          onChange={(e) => updateWorkSchedule(value, 'end', e.target.value)}
                          className="w-28"
                        />
                        <div className="flex items-center space-x-2 ml-4">
                          <Label className="text-sm text-muted-foreground">Pausa:</Label>
                          <Input
                            type="number"
                            value={daySchedule.break_minutes || 60}
                            onChange={(e) => updateWorkSchedule(value, 'break_minutes', parseInt(e.target.value) || 0)}
                            className="w-20"
                            min="0"
                            max="480"
                            placeholder="60"
                          />
                          <span className="text-sm text-muted-foreground">min</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {contract ? 'Atualizar' : 'Criar'} Contrato
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}