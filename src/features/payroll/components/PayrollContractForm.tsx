import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PayrollContract,
  ContractFormData
} from '../types';
import { payrollService } from '../services/payrollService';
import { contractSyncService } from '../services/contractSyncService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleProvider';
import { useFamily } from '@/features/family/FamilyContext';
import { getCurrencies } from '@/services/currencies';
import { logger } from '@/shared/lib/logger';
import { useContractConfig, useConfigurationStatus } from '../hooks/usePayrollConfig';
import { usePayrollNotifications } from '../hooks/usePayrollNotifications';


interface PayrollContractFormProps {
  contract?: PayrollContract;
  onSave?: (contract: PayrollContract) => void;
  onCancel?: () => void;
}





export function PayrollContractForm({ contract, onSave, onCancel }: PayrollContractFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { family } = useFamily();
  const { currency: defaultCurrency } = useLocale();
  
  // Usar o novo contexto de configuração
  const { 
    contracts, 
    loading: contextLoading, 
    saveContract, 
    syncHolidays
  } = useContractConfig();
  
  // Usar o hook de status para validação
  const { validateConfiguration } = useConfigurationStatus(contract?.id);
  
  // Sistema de notificações
  const { notifications, addNotification, removeNotification } = usePayrollNotifications();

  const [loading, setLoading] = useState(false);
  const [syncingHolidays, setSyncingHolidays] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState<ContractFormData>({
    name: '',
    base_salary_cents: 0,
    weekly_hours: 40,
    schedule_json: {},
    vacation_bonus_mode: 'monthly',
    christmas_bonus_mode: 'monthly',
    is_active: true,
    currency: defaultCurrency || 'EUR',
    job_category: '',
    workplace_location: '',
    duration: undefined,
    has_probation_period: false,
    probation_duration_days: 90
  });

  // Estados temporários para entrada de valores como strings
  const [baseSalaryInput, setBaseSalaryInput] = useState('');
  const [weeklyHoursInput, setWeeklyHoursInput] = useState('');
  const [currencyOptions, setCurrencyOptions] = useState<{ code: string; name?: string }[]>([]);

  useEffect(() => {
    if (contract) {
      // Verificar se o contrato tem o formato antigo (dias individuais) ou novo (horário padrão)
      const hasOldFormat = contract.schedule_json && Object.keys(contract.schedule_json).some(key => 
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(key)
      );
      
      let scheduleJson = contract.schedule_json || {};
      
      // Se tem formato antigo, converter para formato novo (horário padrão desativado)
      if (hasOldFormat && !contract.schedule_json?.use_standard) {
        scheduleJson = {
          use_standard: false,
          start_time: '09:00',
          end_time: '18:00',
          break_minutes: 60
        };
      }
      
      setFormData({
        name: contract.name,
        base_salary_cents: contract.base_salary_cents,
        weekly_hours: contract.weekly_hours || 40,
        schedule_json: scheduleJson,
        vacation_bonus_mode: (contract as any).vacation_bonus_mode || 'monthly',
        christmas_bonus_mode: (contract as any).christmas_bonus_mode || 'monthly',
        is_active: contract.is_active,
        currency: contract.currency || defaultCurrency || 'EUR',
        job_category: (contract as any).job_category || '',
        workplace_location: (contract as any).workplace_location || '',
        duration: (contract as any).duration || undefined,
        has_probation_period: (contract as any).has_probation_period || false,
        probation_duration_days: (contract as any).probation_duration_days || 90
      });
      
      // Inicializar valores de entrada como strings
      setBaseSalaryInput(contract.base_salary_cents > 0 ? (contract.base_salary_cents / 100).toString().replace('.', ',') : '');
      setWeeklyHoursInput(contract.weekly_hours ? contract.weekly_hours.toString().replace('.', ',') : '40');
    }
  }, [contract, defaultCurrency]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('🔄 Loading currencies...');
        const { data, error } = await getCurrencies();
        console.log('💰 Currency service response:', { data, error });
        if (error) throw error;
        if (!mounted) return;
        const opts = (data || []).map((c: any) => ({ code: c.code as string, name: c.name as string }));
        const finalOptions = opts.length > 0 ? opts : [{ code: 'EUR', name: 'Euro' }];
        console.log('✅ Setting currency options:', finalOptions);
        setCurrencyOptions(finalOptions);
      } catch (e) {
        console.log('❌ Currency loading error:', e);
        // Em caso de erro, fallback para EUR
        if (mounted) {
          console.log('🔄 Using fallback currency options');
          setCurrencyOptions([{ code: 'EUR', name: 'Euro' }]);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Validação em tempo real
  useEffect(() => {
    // Verificar se temos todos os dados necessários incluindo um contract válido
    if (formData.name && formData.base_salary_cents > 0 && contract?.id && validateConfiguration) {
      validateConfiguration()
        .then((isValid) => {
          if (!isValid) {
            // Se a validação falhou, os erros já estão no contexto
            // Vamos buscar os erros de validação do contexto
            const contractErrors = validationErrors.general || [];
            setValidationErrors(contractErrors);
          } else {
            setValidationErrors([]);
          }
        })
        .catch((error) => {
          console.error('Erro na validação:', error);
          // Verificar se o erro é relacionado com ID inválido para dar uma mensagem mais clara
          if (error.message?.includes('ID do contrato inválido')) {
            setValidationErrors(['Contrato não selecionado ou inválido']);
          } else {
            setValidationErrors([error.message || 'Erro na validação']);
          }
        });
    } else {
      // Limpar erros de validação se não temos dados suficientes
      setValidationErrors([]);
    }
  }, [formData, validateConfiguration, validationErrors.general, contract?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      addNotification({
        type: 'error',
        message: 'Utilizador não encontrado',
        component: 'contract'
      });
      return;
    }

    // Validação básica
    const errors: string[] = [];
    
    if (!formData.name || formData.name.trim() === '') {
      errors.push('Nome do contrato é obrigatório');
    }
    
    if (isNaN(formData.base_salary_cents) || formData.base_salary_cents <= 0) {
      errors.push('Salário base deve ser maior que 0');
    }
    
    if (isNaN(formData.weekly_hours) || formData.weekly_hours < 20 || formData.weekly_hours > 60) {
      errors.push('Horas por semana deve estar entre 20 e 60');
    }
    
    const isValidISO = /^[A-Z]{3}$/.test(formData.currency || '');
    const inList = currencyOptions.length === 0 ? true : currencyOptions.some(c => c.code === formData.currency);
    
    if (!isValidISO || !inList) {
      errors.push('Por favor escolhe uma moeda válida');
    }
    
    if (errors.length > 0) {
      errors.forEach(error => {
        addNotification({
          type: 'error',
          message: error,
          component: 'contract'
        });
      });
      return;
    }

    setLoading(true);

    try {
      // Usar o contexto para salvar o contrato
      const savedContract = await saveContract(formData, contract?.id);
      
      addNotification({
        type: 'success',
        message: contract ? 'Contrato atualizado com sucesso' : 'Contrato criado com sucesso',
        component: 'contract'
      });

      // Para novos contratos, sincronizar todos os parâmetros obrigatórios
      if (!contract?.id) {
        try {
          setSyncingHolidays(true);
          await contractSyncService.syncAllContractParameters(savedContract.id, savedContract.user_id);
          
          addNotification({
            type: 'success',
            message: 'Configurações do contrato inicializadas com sucesso',
            component: 'contract'
          });
        } catch (syncError) {
          logger.warn('Erro na sincronização de parâmetros do contrato:', syncError);
          addNotification({
            type: 'warning',
            message: 'Erro ao inicializar configurações do contrato',
            component: 'contract'
          });
        } finally {
          setSyncingHolidays(false);
        }
      } else {
        // Para contratos existentes, apenas sincronizar feriados se localização estiver definida
        if (formData.workplace_location && formData.workplace_location.trim() !== '') {
          try {
            setSyncingHolidays(true);
            const currentYear = new Date().getFullYear();
            await syncHolidays(savedContract.id, currentYear, formData.workplace_location);
            
            addNotification({
              type: 'success',
              message: 'Feriados sincronizados com sucesso',
              component: 'holidays'
            });
          } catch (holidayError) {
            logger.warn('Erro na sincronização de feriados:', holidayError);
            addNotification({
              type: 'warning',
              message: 'Erro ao sincronizar feriados regionais',
              component: 'holidays'
            });
          } finally {
            setSyncingHolidays(false);
          }
        }
      }

      onSave?.(savedContract);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro ao salvar o contrato.';
      
      addNotification({
        type: 'error',
        message: errorMessage,
        component: 'contract'
      });
    } finally {
      setLoading(false);
    }
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



  const handleWeeklyHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Permitir valores vazios, positivos e vírgula/ponto (não permitir negativos para horas)
    if (value === '' || /^\d*[,.]?\d*$/.test(value)) {
      setWeeklyHoursInput(value);
      
      // Converter para número apenas se for um número válido
      if (value === '') {
        setFormData(prev => ({ ...prev, weekly_hours: 0 }));
      } else {
        const numericValue = value.replace(',', '.');
        const parsedValue = parseFloat(numericValue);
        if (!isNaN(parsedValue) && parsedValue >= 0) {
          setFormData(prev => ({ ...prev, weekly_hours: parsedValue }));
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
        {/* Notificações */}
        {notifications.length > 0 && (
          <div className="space-y-2 mb-6">
            {notifications.map((notification) => (
              <Alert 
                key={notification.id} 
                variant={notification.type === 'error' ? 'destructive' : 'default'}
                className={notification.type === 'success' ? 'border-green-200 bg-green-50' : 
                          notification.type === 'warning' ? 'border-yellow-200 bg-yellow-50' : ''}
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex justify-between items-center">
                  {notification.message}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeNotification(notification.id)}
                    className="h-auto p-1 ml-2"
                  >
                    ×
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
        
        {/* Erros de validação */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Problemas de configuração:</div>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={`validation-error-${error.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}-${index}`} className="text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Contrato</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Contrato Principal, Tempo Integral, Meio Período"
                required
                autoComplete="off"
              />
              <p className="text-sm text-muted-foreground">
                Insira um nome descritivo para este contrato (não o nome do funcionário)
              </p>
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

          {/* Informações do Contrato */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job_category">Categoria Profissional</Label>
              <Input
                id="job_category"
                value={formData.job_category || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, job_category: e.target.value }))}
                placeholder="Ex: Técnico, Administrativo, Gestor"
                autoComplete="organization-title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="workplace_location">Local de Trabalho</Label>
              <Input
                id="workplace_location"
                value={formData.workplace_location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, workplace_location: e.target.value }))}
                placeholder="Ex: Lisboa, Porto, Remoto"
                autoComplete="address-level2"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Duração do Contrato (meses)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    duration: value === '' ? undefined : parseInt(value) 
                  }));
                }}
                placeholder="Deixar vazio para contrato permanente"
                min="1"
                max="120"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Deixar vazio para contrato sem termo
              </p>
            </div>
          </div>

          {/* Período Experimental */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="has_probation_period"
                checked={formData.has_probation_period || false}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_probation_period: checked }))}
              />
              <Label htmlFor="has_probation_period" className="text-base font-semibold">
                Período Experimental
              </Label>
            </div>
            
            {formData.has_probation_period && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="probation_duration_days">Duração do Período Experimental (dias)</Label>
                  <Input
                    id="probation_duration_days"
                    type="number"
                    value={formData.probation_duration_days || 90}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 90;
                      setFormData(prev => ({ ...prev, probation_duration_days: value }));
                    }}
                    min="30"
                    max="240"
                    className="w-32"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Normalmente 90 dias (3 meses) para a maioria dos contratos
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Valores Monetários e Horas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_salary">Salário Base ({formData.currency || 'EUR'})</Label>
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
              <Label htmlFor="weekly_hours">Horas por Semana</Label>
              <Input
                id="weekly_hours"
                type="text"
                value={weeklyHoursInput}
                onChange={handleWeeklyHoursChange}
                placeholder="40"
                required
                autoComplete="off"
                aria-describedby="weekly_hours_help"
              />
              <p id="weekly_hours_help" className="text-xs text-muted-foreground">
                Entre 20 e 60 horas
              </p>
            </div>
            


            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Seleciona a moeda" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map(option => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.code}{option.name ? ` — ${option.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>



          {/* Horário de Trabalho */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="use_standard_schedule"
                checked={formData.schedule_json?.use_standard || false}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({
                    ...prev,
                    schedule_json: {
                      ...prev.schedule_json,
                      use_standard: checked,
                      start_time: checked ? (prev.schedule_json?.start_time || '09:00') : undefined,
                      end_time: checked ? (prev.schedule_json?.end_time || '18:00') : undefined,
                      break_minutes: checked ? (prev.schedule_json?.break_minutes || 60) : undefined
                    }
                  }));
                }}
              />
              <Label htmlFor="use_standard_schedule" className="text-base font-semibold">
                Usar horário padrão
              </Label>
            </div>
            
            {formData.schedule_json?.use_standard && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium">Início</Label>
                    <Input
                      type="time"
                      value={formData.schedule_json?.start_time || '09:00'}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          schedule_json: {
                            ...prev.schedule_json,
                            start_time: e.target.value
                          }
                        }));
                      }}
                      className="w-28"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium">Fim</Label>
                    <Input
                      type="time"
                      value={formData.schedule_json?.end_time || '18:00'}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          schedule_json: {
                            ...prev.schedule_json,
                            end_time: e.target.value
                          }
                        }));
                      }}
                      className="w-28"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium">Pausa (minutos)</Label>
                    <Input
                      type="number"
                      value={formData.schedule_json?.break_minutes || 60}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          schedule_json: {
                            ...prev.schedule_json,
                            break_minutes: parseInt(e.target.value) || 0
                          }
                        }));
                      }}
                      className="w-20"
                      min="0"
                      max="480"
                      placeholder="60"
                    />
                  </div>
                </div>
                
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={loading || syncingHolidays}
            >
              {(loading || syncingHolidays) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {syncingHolidays ? 'A sincronizar feriados...' : 
               loading ? 'A guardar...' : 
               (contract ? 'Atualizar' : 'Criar')} Contrato
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}