import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Info, Percent, Calculator, Settings, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { payrollService } from '../services/payrollService';
import { deductionInferenceService } from '../services/deductionInferenceService';
import { PayrollDeductionConfigFormData } from '../types';
import { PayrollDeductionConditions } from './PayrollDeductionConditions';

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
  const [showConditions, setShowConditions] = useState(false);
  const [autoDeductionsEnabled, setAutoDeductionsEnabled] = useState(false);
  const [isLoadingAutoState, setIsLoadingAutoState] = useState(false);

  const form = useForm<PayrollDeductionConfigFormData>({
    resolver: zodResolver(deductionSchema),
    defaultValues: {
      irsPercentage: 0,
      socialSecurityPercentage: 11,
      irsSurchargePercentage: 0,
      solidarityContributionPercentage: 0
    }
  });

  // Carregar configuração existente e estado do modo automático
  useEffect(() => {
    const loadConfig = async () => {
      if (!user?.id || !contractId) return;
      
      setIsLoading(true);
      try {
        // Carregar configuração de descontos
        const config = await payrollService.getDeductionConfig(user.id, contractId);
        if (config) {
          form.reset({
            irsPercentage: config.irs_percentage,
            socialSecurityPercentage: config.social_security_percentage,
            irsSurchargePercentage: config.irs_surcharge_percentage || 0,
            solidarityContributionPercentage: config.solidarity_contribution_percentage || 0
          });
        }
        
        // Verificar se modo automático está ativo (feature flag + estado do contrato)
        const featureFlagEnabled = deductionInferenceService.isAutoDeductionsEnabled();
        if (featureFlagEnabled) {
          const autoState = await deductionInferenceService.getAutoDeductionsState(user.id, contractId);
          setAutoDeductionsEnabled(autoState);
        } else {
          setAutoDeductionsEnabled(false);
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
  
  const handleAutoToggle = async (enabled: boolean) => {
    if (!user?.id) return;
    
    setIsLoadingAutoState(true);
    try {
      await deductionInferenceService.setAutoDeductionsEnabled(user.id, contractId, enabled);
      setAutoDeductionsEnabled(enabled);
      
      toast({
        title: 'Sucesso',
        description: enabled 
          ? 'Cálculo automático ativado. Configure as condições para calcular as percentagens.'
          : 'Cálculo automático desativado. Pode agora editar as percentagens manualmente.'
      });
    } catch (error) {
      console.error('Erro ao alterar modo automático:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o modo de cálculo.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingAutoState(false);
    }
  };
  
  const handleConditionsUpdated = (irsRate: number, ssRate: number) => {
    // Atualizar os valores do formulário com as percentagens calculadas
    form.setValue('irsPercentage', irsRate);
    form.setValue('socialSecurityPercentage', ssRate);
    
    // Voltar para a vista principal
    setShowConditions(false);
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
  
  // Se estamos a mostrar a sub-página de condições
  if (showConditions) {
    return (
      <PayrollDeductionConditions
        contractId={contractId}
        onBack={() => setShowConditions(false)}
        onConditionsUpdated={handleConditionsUpdated}
      />
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
        {/* Toggle de Cálculo Automático - só mostra se feature flag estiver ativa */}
        {deductionInferenceService.isAutoDeductionsEnabled() && (
          <div className="mb-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Cálculo Automático (IRS/SS)</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {autoDeductionsEnabled 
                    ? 'As percentagens são calculadas automaticamente com base nas condições configuradas.'
                    : 'Configure manualmente as percentagens de IRS e Segurança Social.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {autoDeductionsEnabled && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowConditions(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Condições
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
                <Switch
                  checked={autoDeductionsEnabled}
                  onCheckedChange={handleAutoToggle}
                  disabled={isLoadingAutoState}
                />
              </div>
            </div>
            
            {autoDeductionsEnabled && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Modo Automático Ativo:</strong> As percentagens são calculadas automaticamente. 
                  Os campos abaixo ficam apenas para visualização. Para alterar, configure as condições ou desative o modo automático.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <Separator className="mb-8" />
        
        {/* Tabelas de Referência */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Tabelas de Referência - Legislação Portuguesa</h3>
          </div>
          
          <Tabs defaultValue="irs" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="irs">Escalões de IRS 2025</TabsTrigger>
              <TabsTrigger value="ss">Segurança Social</TabsTrigger>
            </TabsList>
            
            <TabsContent value="irs" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Como usar:</strong> Identifique o seu escalão com base no rendimento coletável anual (rendimento bruto - deduções específicas). Use a taxa normal para configurar o IRS.
                </AlertDescription>
              </Alert>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Escalão</TableHead>
                      <TableHead>Rendimento Coletável Anual</TableHead>
                      <TableHead>Taxa Normal</TableHead>
                      <TableHead>Taxa Média</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">1º</TableCell>
                      <TableCell>Até 8.059 €</TableCell>
                      <TableCell className="font-semibold text-green-600">13%</TableCell>
                      <TableCell>13%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">2º</TableCell>
                      <TableCell>8.059 € - 12.160 €</TableCell>
                      <TableCell className="font-semibold text-green-600">16,5%</TableCell>
                      <TableCell>14,18%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">3º</TableCell>
                      <TableCell>12.160 € - 17.233 €</TableCell>
                      <TableCell className="font-semibold text-green-600">22%</TableCell>
                      <TableCell>16,482%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">4º</TableCell>
                      <TableCell>17.233 € - 22.306 €</TableCell>
                      <TableCell className="font-semibold text-green-600">25%</TableCell>
                      <TableCell>18,419%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">5º</TableCell>
                      <TableCell>22.306 € - 28.400 €</TableCell>
                      <TableCell className="font-semibold text-green-600">32%</TableCell>
                      <TableCell>21,334%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">6º</TableCell>
                      <TableCell>28.400 € - 41.629 €</TableCell>
                      <TableCell className="font-semibold text-green-600">35,5%</TableCell>
                      <TableCell>25,835%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">7º</TableCell>
                      <TableCell>41.629 € - 44.987 €</TableCell>
                      <TableCell className="font-semibold text-green-600">43,5%</TableCell>
                      <TableCell>27,154%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">8º</TableCell>
                      <TableCell>44.987 € - 83.696 €</TableCell>
                      <TableCell className="font-semibold text-green-600">45%</TableCell>
                      <TableCell>35,408%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">9º</TableCell>
                      <TableCell>Superior a 83.696 €</TableCell>
                      <TableCell className="font-semibold text-green-600">48%</TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <Alert>
                <AlertDescription>
                  <strong>Sobretaxa e Contribuição de Solidariedade:</strong> Aplicáveis a rendimentos superiores a 80.000 € anuais, com taxas até 5% cada.
                </AlertDescription>
              </Alert>
            </TabsContent>
            
            <TabsContent value="ss" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Segurança Social:</strong> As taxas são fixas e aplicam-se sobre a remuneração bruta mensal.
                </AlertDescription>
              </Alert>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Regime</TableHead>
                      <TableHead>Taxa do Trabalhador</TableHead>
                      <TableHead>Taxa da Entidade Empregadora</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Trabalhadores por conta de outrem</TableCell>
                      <TableCell className="font-semibold text-blue-600">11%</TableCell>
                      <TableCell>23,75%</TableCell>
                      <TableCell>34,75%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Membros de Órgãos Estatutários</TableCell>
                      <TableCell className="font-semibold text-blue-600">9,3% / 11%</TableCell>
                      <TableCell>20,3% / 23,75%</TableCell>
                      <TableCell>29,6% / 34,75%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Pensionistas em atividade (velhice)</TableCell>
                      <TableCell className="font-semibold text-blue-600">7,5% - 7,8%</TableCell>
                      <TableCell>16,4% - 17,5%</TableCell>
                      <TableCell>23,9% - 25,3%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Trabalhadores independentes</TableCell>
                      <TableCell className="font-semibold text-blue-600">21,4% / 25,2%</TableCell>
                      <TableCell>7% / 10%</TableCell>
                      <TableCell>28,4% / 35,2%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <Alert>
                <AlertDescription>
                  <strong>Nota:</strong> Para a maioria dos trabalhadores por conta de outrem, a taxa aplicável é de <strong>11%</strong>. O valor do IAS para 2025 é de 522,50 €.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </div>

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
                readOnly={autoDeductionsEnabled}
                {...register('irsPercentage', {
                  required: 'Percentagem de IRS é obrigatória',
                  min: { value: 0, message: 'Percentagem deve ser maior ou igual a 0' },
                  max: { value: 100, message: 'Percentagem deve ser menor ou igual a 100' },
                  valueAsNumber: true
                })}
                className={`${errors.irsPercentage ? 'border-red-500' : ''} ${autoDeductionsEnabled ? 'bg-muted cursor-not-allowed' : ''}`}
              />
              {errors.irsPercentage && (
                <p className="text-sm text-red-500">{errors.irsPercentage.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {autoDeductionsEnabled 
                  ? 'Percentagem calculada automaticamente com base nas condições'
                  : 'Percentagem de IRS aplicada sobre (Bruto - SS trabalhador)'}
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
                readOnly={autoDeductionsEnabled}
                {...register('socialSecurityPercentage', {
                  required: 'Percentagem de Segurança Social é obrigatória',
                  min: { value: 0, message: 'Percentagem deve ser maior ou igual a 0' },
                  max: { value: 100, message: 'Percentagem deve ser menor ou igual a 100' },
                  valueAsNumber: true
                })}
                className={`${errors.socialSecurityPercentage ? 'border-red-500' : ''} ${autoDeductionsEnabled ? 'bg-muted cursor-not-allowed' : ''}`}
              />
              {errors.socialSecurityPercentage && (
                <p className="text-sm text-red-500">{errors.socialSecurityPercentage.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {autoDeductionsEnabled 
                  ? 'Percentagem calculada automaticamente com base nas condições'
                  : 'Percentagem de Segurança Social aplicada sobre o salário bruto'}
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

          {/* Preview section removed - not needed in the interface */}

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Informação:</strong>
              <ul className="mt-2 space-y-1">
                <li>• {autoDeductionsEnabled 
                  ? 'IRS é aplicado sobre (Bruto - SS trabalhador), SS sobre o salário bruto'
                  : 'As percentagens são aplicadas sobre o salário bruto (incluindo horas extras e subsídios)'}</li>
                <li>• Valores típicos em Portugal: IRS 11-48%, Segurança Social 11%</li>
                <li>• Estas configurações aplicam-se a todos os cálculos futuros deste contrato</li>
                {autoDeductionsEnabled && (
                  <li>• <strong>Modo Automático:</strong> Configure as condições para cálculo preciso das percentagens</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isSaving || autoDeductionsEnabled}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {autoDeductionsEnabled ? 'Configuração Automática' : 'Guardar Configuração'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}