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

interface PayrollOTPolicyFormProps {
  policy?: PayrollOTPolicy;
  onSave?: (policy: PayrollOTPolicy) => void;
  onCancel?: () => void;
}

const OT_TYPES = [
  { value: 'daily', label: 'Horas Extras Diárias', description: 'Aplicado quando excede horas diárias' },
  { value: 'weekly', label: 'Horas Extras Semanais', description: 'Aplicado quando excede horas semanais' },
  { value: 'holiday', label: 'Trabalho em Feriados', description: 'Aplicado em dias feriados' },
  { value: 'weekend', label: 'Trabalho ao Fim de Semana', description: 'Aplicado aos sábados e domingos' },
  { value: 'night', label: 'Trabalho Noturno', description: 'Aplicado durante período noturno' }
];

export function PayrollOTPolicyForm({ policy, onSave, onCancel }: PayrollOTPolicyFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PayrollOTPolicyFormData>({
    name: '',
    ot_type: 'daily',
    threshold_hours: 8,
    multiplier: 1.5,
    max_daily_ot_hours: null,
    max_weekly_ot_hours: null,
    night_start_time: '22:00',
    night_end_time: '06:00',
    is_active: true,
    description: ''
  });

  useEffect(() => {
    if (policy) {
      setFormData({
        name: policy.name,
        ot_type: policy.ot_type,
        threshold_hours: policy.threshold_hours || 8,
        multiplier: policy.multiplier,
        max_daily_ot_hours: policy.max_daily_ot_hours,
        max_weekly_ot_hours: policy.max_weekly_ot_hours,
        night_start_time: policy.night_start_time || '22:00',
        night_end_time: policy.night_end_time || '06:00',
        is_active: policy.is_active,
        description: policy.description || ''
      });
    }
  }, [policy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setLoading(true);

    try {
      let savedPolicy: PayrollOTPolicy;
      
      if (policy?.id) {
        savedPolicy = await payrollService.updateOTPolicy(policy.id, formData);
        toast({
          title: 'Política atualizada',
          description: 'A política foi atualizada com sucesso.'
        });
      } else {
        savedPolicy = await payrollService.createOTPolicy(user.id, formData);
        toast({
          title: 'Política criada',
          description: 'A nova política foi criada com sucesso.'
        });
      }

      onSave?.(savedPolicy);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar a política.',
        variant: 'destructive'
      });
      console.error('Error saving OT policy:', error);
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
          {policy ? 'Editar Política de Horas Extras' : 'Nova Política de Horas Extras'}
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
                value={formData.name}
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
                  value={formData.threshold_hours}
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
                step="0.1"
                min="1"
                value={formData.multiplier}
                onChange={(e) => setFormData(prev => ({ ...prev, multiplier: parseFloat(e.target.value) || 1 }))}
                placeholder="1.5"
                required
              />
              <p className="text-sm text-muted-foreground">
                Ex: 1.5 = 150% do valor normal
              </p>
            </div>
          </div>

          {/* Limites Máximos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_daily_ot_hours">Máximo HE Diárias (opcional)</Label>
              <Input
                id="max_daily_ot_hours"
                type="number"
                step="0.5"
                min="0"
                value={formData.max_daily_ot_hours || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_daily_ot_hours: e.target.value ? parseFloat(e.target.value) : null 
                }))}
                placeholder="Ex: 4"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_weekly_ot_hours">Máximo HE Semanais (opcional)</Label>
              <Input
                id="max_weekly_ot_hours"
                type="number"
                step="0.5"
                min="0"
                value={formData.max_weekly_ot_hours || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_weekly_ot_hours: e.target.value ? parseFloat(e.target.value) : null 
                }))}
                placeholder="Ex: 20"
              />
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
                  value={formData.night_start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, night_start_time: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="night_end_time">Fim do Período Noturno</Label>
                <Input
                  id="night_end_time"
                  type="time"
                  value={formData.night_end_time}
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
              value={formData.description}
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