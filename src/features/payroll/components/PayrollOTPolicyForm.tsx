import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Plus, Trash2, Clock } from 'lucide-react';
import { PayrollOTPolicy, PayrollOTPolicyFormData } from '../types';
import { payrollService } from '../services/payrollService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveContract } from '../hooks/useActiveContract';

interface PayrollOTPolicyFormProps {
  policy?: PayrollOTPolicy;
  contractId?: string;
  onSave?: (policy: PayrollOTPolicy) => void;
  onCancel?: () => void;
}

const OT_TYPES = [
  { value: 'daily', label: 'Horas Extras Diárias', description: 'Aplicado quando excede horas diárias' },
  { value: 'weekly', label: 'Horas Extras por Semana', description: 'Aplicado quando excede horas por semana' },
  { value: 'holiday', label: 'Trabalho em Feriados', description: 'Aplicado em dias feriados' },
  { value: 'weekend', label: 'Trabalho ao Fim de Semana', description: 'Aplicado aos sábados e domingos' },
  { value: 'night', label: 'Trabalho Noturno', description: 'Aplicado durante período noturno' }
];

export function PayrollOTPolicyForm({ policy, contractId, onSave, onCancel }: PayrollOTPolicyFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeContract } = useActiveContract();
  const [loading, setLoading] = useState(false);
  const [loadedPolicy, setLoadedPolicy] = useState<PayrollOTPolicy | null>(null);
  const [formData, setFormData] = useState<PayrollOTPolicyFormData>({
    name: '',
    ot_type: 'daily',
    threshold_hours: 8,
    multiplier: 1.25, // Valor padrão alinhado com constraints
    max_daily_ot_hours: 2, // Máximo permitido pela constraint (1-2)
    max_weekly_ot_hours: 48, // Mínimo permitido pela constraint (48-60)
    max_annual_ot_hours: 150, // Mínimo permitido pela constraint (150-175)
    night_start_time: '22:00',
    night_end_time: '07:00', // Valor padrão da base de dados
    is_active: true,
    description: ''
  });

  // Carregar política por contractId se fornecido
  useEffect(() => {
    const loadPolicyByContract = async () => {
      if (!contractId || !user?.id) return;
      
      setLoading(true);
      try {
        const policies = await payrollService.getOTPolicies(user.id, contractId);
        if (policies && policies.length > 0) {
          setLoadedPolicy(policies[0]); // Usar a primeira política encontrada
        }
      } catch (error) {
        console.error('Erro ao carregar política de horas extras:', error);
      } finally {
        setLoading(false);
      }
    };

    if (contractId) {
      loadPolicyByContract();
    }
  }, [contractId, user?.id]);

  // Atualizar formData quando policy ou loadedPolicy mudar
  useEffect(() => {
    const currentPolicy = policy || loadedPolicy;
    if (currentPolicy) {
      setFormData({
        name: currentPolicy.name,
        ot_type: currentPolicy.ot_type,
        threshold_hours: currentPolicy.threshold_hours || 8,
        multiplier: currentPolicy.multiplier,
        // Garantir que os valores carregados respeitam as constraints
        max_daily_ot_hours: Math.min(Math.max(currentPolicy.max_daily_ot_hours || 2, 1), 2),
        max_weekly_ot_hours: Math.min(Math.max(currentPolicy.max_weekly_ot_hours || 48, 48), 60),
        max_annual_ot_hours: Math.min(Math.max(currentPolicy.annual_limit_hours || 150, 150), 175),
        night_start_time: currentPolicy.night_start_time || '22:00',
        night_end_time: currentPolicy.night_end_time || '07:00',
        is_active: currentPolicy.is_active,
        description: currentPolicy.description || ''
      });
    }
  }, [policy, loadedPolicy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Utilizador não autenticado',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Converter PayrollOTPolicyFormData para OTPolicyFormData
      // Garantir que os valores respeitam as constraints da base de dados
      const convertedData = {
        name: formData.name,
        firstHourMultiplier: formData.ot_type === 'daily' ? formData.multiplier : 1.25,
        subsequentHoursMultiplier: formData.ot_type === 'night' ? formData.multiplier : 1.50,
        weekendMultiplier: formData.ot_type === 'weekend' ? formData.multiplier : 1.50,
        holidayMultiplier: formData.ot_type === 'holiday' ? formData.multiplier : 2.00,
        nightStartTime: formData.night_start_time || '22:00',
        nightEndTime: formData.night_end_time || '07:00',
        roundingMinutes: 15, // Valor padrão (deve ser > 0)
        // dailyLimitHours: deve estar entre 1 e 2
        dailyLimitHours: Math.min(Math.max(formData.max_daily_ot_hours || 2, 1), 2),
        // annualLimitHours: deve estar entre 150 e 175
        annualLimitHours: Math.min(Math.max(formData.max_annual_ot_hours || 150, 150), 175),
        // weeklyLimitHours: deve estar entre 48 e 60
        weeklyLimitHours: Math.min(Math.max(formData.max_weekly_ot_hours || 48, 48), 60)
      };
      
      let savedPolicy: PayrollOTPolicy;
      
      const currentPolicy = policy || loadedPolicy;
      if (currentPolicy?.id) {
        savedPolicy = await payrollService.updateOTPolicy(currentPolicy.id, convertedData, user.id, contractId);
        toast({
          title: 'Sucesso',
          description: 'Política de horas extras atualizada com sucesso!'
        });
      } else {
        // Criar nova política - usar contractId fornecido ou contrato ativo
        const targetContractId = contractId || activeContract?.id;
        if (!targetContractId) {
          throw new Error('Nenhum contrato ativo encontrado. É necessário ter um contrato ativo para criar políticas de horas extras.');
        }
        savedPolicy = await payrollService.createOTPolicy(user.id, convertedData, targetContractId);
        toast({
          title: 'Sucesso',
          description: 'Política de horas extras criada com sucesso!'
        });
      }
      
      if (onSave) {
        onSave(savedPolicy);
      }
    } catch (error) {
      console.error('Erro ao guardar política de horas extras:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao guardar política de horas extras. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedOTType = OT_TYPES.find(type => type.value === formData.ot_type);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {(policy || loadedPolicy) ? 'Editar Política de Horas Extras' : 'Nova Política de Horas Extras'}
        </CardTitle>
        <CardDescription>
          Configure as regras para cálculo de horas extras, incluindo limites e multiplicadores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Política</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Política Padrão de HE"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="is_active">Política Ativa</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.is_active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>
          </div>

          {/* Tipo de Horas Extras */}
          <div className="space-y-2">
            <Label htmlFor="ot_type">Tipo de Horas Extras</Label>
            <Select
              value={formData.ot_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, ot_type: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOTType && (
              <Alert>
                <AlertDescription>
                  {selectedOTType.description}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Configurações Específicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(formData.ot_type === 'daily' || formData.ot_type === 'weekly') && (
              <div className="space-y-2">
                <Label htmlFor="threshold_hours">Limite de Horas ({formData.ot_type === 'daily' ? 'diárias' : 'semanais'})</Label>
                <Input
                  id="threshold_hours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.threshold_hours || 8}
                  onChange={(e) => setFormData(prev => ({ ...prev, threshold_hours: parseFloat(e.target.value) || 0 }))}
                  placeholder="8"
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="multiplier">Multiplicador</Label>
              <Input
                id="multiplier"
                type="number"
                step="0.01"
                min="1"
                value={formData.multiplier || 1.25}
                onChange={(e) => setFormData(prev => ({ ...prev, multiplier: parseFloat(e.target.value) || 1 }))}
                placeholder="1.50"
                required
              />
              <p className="text-sm text-muted-foreground">
                Ex: 1.50 = 150% do valor normal
              </p>
            </div>
          </div>

          {/* Limites Máximos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_daily_ot_hours">Máximo HE Diárias</Label>
              <Input
                id="max_daily_ot_hours"
                type="number"
                step="1"
                min="1"
                max="2"
                value={formData.max_daily_ot_hours || 2}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_daily_ot_hours: Math.min(Math.max(parseInt(e.target.value) || 2, 1), 2)
                }))}
                placeholder="1-2 horas"
                required
              />
              <p className="text-sm text-muted-foreground">
                Limite legal: entre 1 e 2 horas por dia
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_weekly_ot_hours">Máximo Horas Semanais (incluindo HE)</Label>
              <Input
                id="max_weekly_ot_hours"
                type="number"
                step="1"
                min="48"
                max="60"
                value={formData.max_weekly_ot_hours || 48}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_weekly_ot_hours: Math.min(Math.max(parseInt(e.target.value) || 48, 48), 60)
                }))}
                placeholder="48-60 horas"
                required
              />
              <p className="text-sm text-muted-foreground">
                Limite legal: entre 48 e 60 horas por semana (incluindo horas extras)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_annual_ot_hours">Máximo HE Anuais</Label>
              <Input
                id="max_annual_ot_hours"
                type="number"
                step="1"
                min="150"
                max="175"
                value={formData.max_annual_ot_hours || 150}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_annual_ot_hours: Math.min(Math.max(parseInt(e.target.value) || 150, 150), 175)
                }))}
                placeholder="150-175 horas"
                required
              />
              <p className="text-sm text-muted-foreground">
                Limite legal: entre 150 e 175 horas por ano
              </p>
            </div>
          </div>

          {/* Configurações de Trabalho Noturno */}
          {formData.ot_type === 'night' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="night_start_time">Início do Período Noturno</Label>
                <Input
                  id="night_start_time"
                  type="time"
                  value={formData.night_start_time || '22:00'}
                  onChange={(e) => setFormData(prev => ({ ...prev, night_start_time: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="night_end_time">Fim do Período Noturno</Label>
                <Input
                  id="night_end_time"
                  type="time"
                  value={formData.night_end_time || '07:00'}
                  onChange={(e) => setFormData(prev => ({ ...prev, night_end_time: e.target.value }))}
                  required
                />
              </div>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição detalhada da política..."
              rows={3}
            />
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
              {policy ? 'Atualizar' : 'Criar'} Política
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}