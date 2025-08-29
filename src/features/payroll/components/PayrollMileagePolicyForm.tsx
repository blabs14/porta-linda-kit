import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X, Car, Euro } from 'lucide-react';
import { PayrollMileagePolicy, PayrollContract } from '../types';
import { payrollService } from '../services/payrollService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { centsToEuros, eurosToCents } from '../lib/calc';

interface PayrollMileagePolicyFormProps {
  policy?: PayrollMileagePolicy;
  contractId: string;
  onSave: (policy: PayrollMileagePolicy) => void;
  onCancel: () => void;
}

export function PayrollMileagePolicyForm({ policy, contractId, onSave, onCancel }: PayrollMileagePolicyFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState<PayrollContract | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rate_per_km_cents: 0,
    monthly_cap_cents: null as number | null,
    requires_purpose: false,
    requires_origin_destination: false,
    is_active: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (policy) {
      setFormData({
        name: policy.name,
        rate_per_km_cents: policy.rate_per_km_cents,
        monthly_cap_cents: policy.monthly_cap_cents,
        requires_purpose: policy.requires_purpose || false,
        requires_origin_destination: policy.requires_origin_destination || false,
        is_active: policy.is_active
      });
    }
    loadContract();
  }, [policy]);

  const loadContract = async () => {
    if (!user?.id) return;
    
    try {
      const contract = await payrollService.getActiveContract(user.id);
      setContract(contract);
    } catch (error) {
      console.error('Erro ao carregar contrato:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (formData.rate_per_km_cents <= 0) {
      newErrors.rate_per_km_cents = 'Taxa por KM deve ser maior que zero';
    }

    // monthly_cap_cents é opcional e pode ser null ou qualquer valor positivo
    if (formData.monthly_cap_cents !== null && formData.monthly_cap_cents <= 0) {
      newErrors.monthly_cap_cents = 'Limite mensal deve ser maior que zero se especificado';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.id) {
      return;
    }

    setLoading(true);
    try {
      const policyData = {
        ...formData
      };

      let savedPolicy: PayrollMileagePolicy;
      
      if (policy) {
        savedPolicy = await payrollService.updateMileagePolicy(policy.id, policyData, user.id, contractId);
        toast({
          title: 'Política Atualizada',
          description: 'A política de quilometragem foi atualizada com sucesso.'
        });
      } else {
        savedPolicy = await payrollService.createMileagePolicy(user.id, contractId, policyData);
        toast({
          title: 'Política Criada',
          description: 'A política de quilometragem foi criada com sucesso.'
        });
      }

      onSave(savedPolicy);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar política de quilometragem.',
        variant: 'destructive'
      });
      console.error('Error saving mileage policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (value: string) => {
    const euros = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      rate_per_km_cents: eurosToCents(euros)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Política de Quilometragem
          </CardTitle>
          <CardDescription>
            Configure os detalhes da política de quilometragem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome da Política *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Política Padrão de KM"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="rate_per_km">Taxa por KM (€) *</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="rate_per_km"
                  type="number"
                  step="0.01"
                  min="0"
                  value={centsToEuros(formData.rate_per_km_cents).toFixed(2)}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="0.40"
                  className={`pl-10 ${errors.rate_per_km_cents ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.rate_per_km_cents && (
                <p className="text-sm text-red-500 mt-1">{errors.rate_per_km_cents}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Taxa padrão em Portugal: €0.40/km (2025)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monthly_cap_cents">Limite Mensal (€) - Opcional</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="monthly_cap_cents"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_cap_cents ? centsToEuros(formData.monthly_cap_cents).toFixed(2) : ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    monthly_cap_cents: e.target.value ? eurosToCents(parseFloat(e.target.value)) : null
                  }))}
                  placeholder="Ex: 720.00"
                  className={`pl-10 ${errors.monthly_cap_cents ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.monthly_cap_cents && (
                <p className="text-sm text-red-500 mt-1">{errors.monthly_cap_cents}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Valor máximo pago por mês. Deixe vazio para sem limite.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="requires_purpose"
                  checked={formData.requires_purpose}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    requires_purpose: checked
                  }))}
                />
                <Label htmlFor="requires_purpose">Requer Propósito da Viagem</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requires_origin_destination"
                  checked={formData.requires_origin_destination}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    requires_origin_destination: checked
                  }))}
                />
                <Label htmlFor="requires_origin_destination">Requer Origem e Destino</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    is_active: checked
                  }))}
                />
                <Label htmlFor="is_active">Política Ativa</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Informações Legais */}
      <Alert>
        <Car className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p className="font-medium">Informações Legais (Portugal 2024):</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Taxa padrão: €0.36 por quilómetro</li>
              <li>Isento de IRS até ao limite legal</li>
              <li>Requer registo de viagens para fins fiscais</li>
              <li>Aplicável apenas a deslocações em serviço</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Ações */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {loading ? 'Salvando...' : (policy ? 'Atualizar' : 'Criar')} Política
        </Button>
      </div>
    </form>
  );
}