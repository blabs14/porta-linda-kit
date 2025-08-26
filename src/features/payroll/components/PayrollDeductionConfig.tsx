import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Info, Percent } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { payrollService } from '../services/payrollService';
import { PayrollDeductionConfigFormData } from '../types';

// Schema de validação
const deductionSchema = z.object({
  irsPercentage: z.number()
    .min(0, 'Percentagem deve ser maior ou igual a 0')
    .max(100, 'Percentagem deve ser menor ou igual a 100'),
  socialSecurityPercentage: z.number()
    .min(0, 'Percentagem deve ser maior ou igual a 0')
    .max(100, 'Percentagem deve ser menor ou igual a 100'),
  irsSurchargePercentage: z.number()
    .min(0, 'Percentagem deve ser maior ou igual a 0')
    .max(5, 'Sobretaxa IRS não pode exceder 5%')
    .optional(),
  solidarityContributionPercentage: z.number()
    .min(0, 'Percentagem deve ser maior ou igual a 0')
    .max(5, 'Contribuição de solidariedade não pode exceder 5%')
    .optional()
});

interface PayrollDeductionConfigProps {
  contractId: string;
}

export function PayrollDeductionConfig({ contractId }: PayrollDeductionConfigProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<PayrollDeductionConfigFormData>({
    resolver: zodResolver(deductionSchema),
    defaultValues: {
      irsPercentage: 0,
      socialSecurityPercentage: 11,
      irsSurchargePercentage: 0,
      solidarityContributionPercentage: 0
    }
  });

  // Carregar configuração existente
  useEffect(() => {
    const loadConfig = async () => {
      if (!user?.id || !contractId) return;
      
      setIsLoading(true);
      try {
        const config = await payrollService.getDeductionConfig(user.id, contractId);
        if (config) {
          form.reset({
            irsPercentage: config.irs_percentage,
            socialSecurityPercentage: config.social_security_percentage,
            irsSurchargePercentage: config.irs_surcharge_percentage || 0,
            solidarityContributionPercentage: config.solidarity_contribution_percentage || 0
          });
        }
      } catch (error) {
        console.error('Erro ao carregar configuração de descontos:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a configuração de descontos.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [user?.id, contractId, form, toast]);

  const handleSave = async (data: PayrollDeductionConfigFormData) => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const config = {
        irs_percentage: data.irsPercentage,
        social_security_percentage: data.socialSecurityPercentage,
        irs_surcharge_percentage: data.irsSurchargePercentage || 0,
        solidarity_contribution_percentage: data.solidarityContributionPercentage || 0
      };
      
      await payrollService.upsertDeductionConfig(user.id, contractId, config);
      toast({
        title: 'Sucesso',
        description: 'Configuração de descontos guardada com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao guardar configuração de descontos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível guardar a configuração de descontos.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
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
  const { register, handleSubmit, formState: { errors }, watch } = form;

  const irsPercentage = watch('irsPercentage');
  const socialSecurityPercentage = watch('socialSecurityPercentage');
  const irsSurchargePercentage = watch('irsSurchargePercentage');
  const solidarityContributionPercentage = watch('solidarityContributionPercentage');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Configuração de Descontos
        </CardTitle>
        <CardDescription>
          Configure as percentagens de IRS e Segurança Social aplicadas aos cálculos de folha de pagamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* IRS Percentage */}
            <div className="space-y-2">
              <Label htmlFor="irsPercentage">Percentagem de IRS (%) *</Label>
              <Input
                id="irsPercentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="Ex: 11.5"
                {...register('irsPercentage', {
                  required: 'Percentagem de IRS é obrigatória',
                  min: { value: 0, message: 'Percentagem deve ser maior ou igual a 0' },
                  max: { value: 100, message: 'Percentagem deve ser menor ou igual a 100' },
                  valueAsNumber: true
                })}
                className={errors.irsPercentage ? 'border-red-500' : ''}
              />
              {errors.irsPercentage && (
                <p className="text-sm text-red-500">{errors.irsPercentage.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Percentagem de IRS aplicada sobre o salário bruto
              </p>
            </div>

            {/* Social Security Percentage */}
            <div className="space-y-2">
              <Label htmlFor="socialSecurityPercentage">Percentagem de Segurança Social (%) *</Label>
              <Input
                id="socialSecurityPercentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="Ex: 11.0"
                {...register('socialSecurityPercentage', {
                  required: 'Percentagem de Segurança Social é obrigatória',
                  min: { value: 0, message: 'Percentagem deve ser maior ou igual a 0' },
                  max: { value: 100, message: 'Percentagem deve ser menor ou igual a 100' },
                  valueAsNumber: true
                })}
                className={errors.socialSecurityPercentage ? 'border-red-500' : ''}
              />
              {errors.socialSecurityPercentage && (
                <p className="text-sm text-red-500">{errors.socialSecurityPercentage.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Percentagem de Segurança Social aplicada sobre o salário bruto
              </p>
            </div>
          </div>

          {/* Linha 2: Sobretaxa IRS e Contribuição de Solidariedade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* IRS Surcharge Percentage */}
            <div className="space-y-2">
              <Label htmlFor="irsSurchargePercentage">Sobretaxa IRS (%)</Label>
              <Input
                id="irsSurchargePercentage"
                type="number"
                step="0.1"
                min="0"
                max="5"
                placeholder="Ex: 2.5"
                {...register('irsSurchargePercentage', {
                  min: { value: 0, message: 'Percentagem deve ser maior ou igual a 0' },
                  max: { value: 5, message: 'Sobretaxa IRS não pode exceder 5%' },
                  valueAsNumber: true
                })}
                className={errors.irsSurchargePercentage ? 'border-red-500' : ''}
              />
              {errors.irsSurchargePercentage && (
                <p className="text-sm text-red-500">{errors.irsSurchargePercentage.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Aplicável a rendimentos superiores a €80.640 anuais (máx. 5%)
              </p>
            </div>

            {/* Solidarity Contribution Percentage */}
            <div className="space-y-2">
              <Label htmlFor="solidarityContributionPercentage">Contribuição Extraordinária de Solidariedade (%)</Label>
              <Input
                id="solidarityContributionPercentage"
                type="number"
                step="0.1"
                min="0"
                max="5"
                placeholder="Ex: 2.5"
                {...register('solidarityContributionPercentage', {
                  min: { value: 0, message: 'Percentagem deve ser maior ou igual a 0' },
                  max: { value: 5, message: 'Contribuição de solidariedade não pode exceder 5%' },
                  valueAsNumber: true
                })}
                className={errors.solidarityContributionPercentage ? 'border-red-500' : ''}
              />
              {errors.solidarityContributionPercentage && (
                <p className="text-sm text-red-500">{errors.solidarityContributionPercentage.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Aplicável a rendimentos superiores a €80.640 anuais (máx. 5%)
              </p>
            </div>
          </div>

          {/* Preview */}
          {(irsPercentage > 0 || socialSecurityPercentage > 0 || irsSurchargePercentage > 0 || solidarityContributionPercentage > 0) && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Pré-visualização:</strong> Para um salário bruto de €1000, os descontos seriam:
                <ul className="mt-2 space-y-1">
                  <li>• IRS: €{((irsPercentage || 0) * 10).toFixed(2)}</li>
                  <li>• Segurança Social: €{((socialSecurityPercentage || 0) * 10).toFixed(2)}</li>
                  {irsSurchargePercentage > 0 && (
                    <li>• Sobretaxa IRS: €{((irsSurchargePercentage || 0) * 10).toFixed(2)}</li>
                  )}
                  {solidarityContributionPercentage > 0 && (
                    <li>• Contribuição de Solidariedade: €{((solidarityContributionPercentage || 0) * 10).toFixed(2)}</li>
                  )}
                  <li>• <strong>Total de descontos: €{(((irsPercentage || 0) + (socialSecurityPercentage || 0) + (irsSurchargePercentage || 0) + (solidarityContributionPercentage || 0)) * 10).toFixed(2)}</strong></li>
                  <li>• <strong>Salário líquido: €{(1000 - ((irsPercentage || 0) + (socialSecurityPercentage || 0) + (irsSurchargePercentage || 0) + (solidarityContributionPercentage || 0)) * 10).toFixed(2)}</strong></li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Informação:</strong>
              <ul className="mt-2 space-y-1">
                <li>• As percentagens são aplicadas sobre o salário bruto (incluindo horas extras e subsídios)</li>
                <li>• Valores típicos em Portugal: IRS 11-48%, Segurança Social 11%</li>
                <li>• Estas configurações aplicam-se a todos os cálculos futuros deste contrato</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Configuração
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}