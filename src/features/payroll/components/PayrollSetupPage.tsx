import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Loader2, Settings, Users, Clock, Calendar, Plus, Edit, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { PayrollContract, PayrollOTPolicy, PayrollHoliday, PayrollVacation, PayrollMealAllowanceConfig as PayrollMealAllowanceConfigType } from '../types';
import { payrollService } from '../services/payrollService';
import { PayrollVacationsManager } from './PayrollVacationsManager';
import { PayrollMealAllowanceConfig } from './PayrollMealAllowanceConfig';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirmation } from '@/hooks/useConfirmation';
import { formatCurrency } from '@/lib/utils';
import { calculateHourlyRate } from '../lib/calc';

export function PayrollSetupPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirmation = useConfirmation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<PayrollContract[]>([]);
  const [otPolicies, setOTPolicies] = useState<PayrollOTPolicy[]>([]);
  const [holidays, setHolidays] = useState<PayrollHoliday[]>([]);
  const [vacations, setVacations] = useState<PayrollVacation[]>([]);
  const [mealAllowanceConfig, setMealAllowanceConfig] = useState<PayrollMealAllowanceConfigType | null>(null);

  const [activeTab, setActiveTab] = useState('contracts');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const [contractsData, otPoliciesData, holidaysData, vacationsData, activeContract] = await Promise.all([
        payrollService.getContracts(user.id),
        payrollService.getOTPolicies(user.id),
        payrollService.getHolidays(user.id, new Date().getFullYear()),
        payrollService.getVacations(user.id, undefined, new Date().getFullYear()),
        payrollService.getActiveContract(user.id)
      ]);
      
      setContracts(contractsData);
      setOTPolicies(otPoliciesData);
      setHolidays(holidaysData);
      setVacations(vacationsData);

      const mealConfigData = activeContract?.id
        ? await payrollService.getMealAllowanceConfig(user.id, activeContract.id)
        : null;
      setMealAllowanceConfig(mealConfigData);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados de configuração.',
        variant: 'destructive'
      });
      console.error('Error loading payroll data:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteContract = (contract: PayrollContract) => {
    confirmation.confirm(
      {
        title: 'Eliminar Contrato',
        message: `Tem a certeza que deseja eliminar o contrato "${contract.name}"? Esta ação não pode ser desfeita.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'destructive',
      },
      async () => {
        setLoading(true);
        try {
          await payrollService.deleteContract(contract.id);
          toast({
            title: 'Contrato eliminado',
            description: 'O contrato foi eliminado com sucesso.'
          });
          await loadData();
        } catch (error) {
          toast({
            title: 'Erro',
            description: 'Erro ao eliminar contrato.',
            variant: 'destructive'
          });
          console.error('Error deleting contract:', error);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleDeleteOTPolicy = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta política?')) return;

    setLoading(true);
    try {
      await payrollService.deleteOTPolicy(id);
      toast({
        title: 'Política excluída',
        description: 'A política foi excluída com sucesso.'
      });
      await loadData();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir política.',
        variant: 'destructive'
      });
      console.error('Error deleting OT policy:', error);
    } finally {
      setLoading(false);
    }
  };



  const getSetupStatus = () => {
    const hasContracts = contracts.length > 0;
    const hasActivePolicies = otPolicies.some(p => p.is_active);
    const hasHolidays = holidays.length > 0;
    
    const completedSteps = [hasContracts, hasActivePolicies, hasHolidays].filter(Boolean).length;
    const totalSteps = 3;
    
    return {
      isComplete: completedSteps === totalSteps,
      completedSteps,
      totalSteps,
      hasContracts,
      hasActivePolicies,
      hasHolidays
    };
  };

  const status = getSetupStatus();

  if (loading && contracts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Configuração da Folha de Pagamento
              </CardTitle>
              <CardDescription>
                Configure contratos, políticas de horas extras e feriados para o cálculo automático da folha de pagamento.
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                {status.isComplete ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <span className="font-medium">
                  {status.completedSteps}/{status.totalSteps} Configurações
                </span>
              </div>
              <Badge variant={status.isComplete ? 'default' : 'secondary'}>
                {status.isComplete ? 'Configuração Completa' : 'Configuração Pendente'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Status das Configurações */}
      {!status.isComplete && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Configurações pendentes:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                {!status.hasContracts && <li>Criar pelo menos um contrato de trabalho</li>}
                {!status.hasActivePolicies && <li>Configurar políticas de horas extras</li>}
                {!status.hasHolidays && <li>Adicionar feriados do ano atual</li>}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs de Configuração */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contratos ({contracts.length})
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Políticas HE ({otPolicies.length})
          </TabsTrigger>
          <TabsTrigger value="vacations" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Férias ({vacations.length})
          </TabsTrigger>
          <TabsTrigger value="meal-allowance" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Subsídio Alimentação
          </TabsTrigger>
        </TabsList>

        {/* Tab: Contratos */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contratos de Trabalho</CardTitle>
                  <CardDescription>
                    Visualize e gerencie os contratos de trabalho dos funcionários.
                  </CardDescription>
                </div>
                <Button onClick={() => navigate('/personal/payroll/config')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Contrato
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {contracts.length === 0 ? (
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Nenhum contrato configurado. Crie o primeiro contrato para começar a usar a folha de pagamento.</span>
                    <Button 
                      size="sm" 
                      onClick={() => navigate('/personal/payroll/config')}
                      className="ml-4"
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Criar Primeiro Contrato
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Salário Base</TableHead>
                      <TableHead>Taxa Horária</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{contract.name}</TableCell>
                        <TableCell>{formatCurrency(contract.base_salary_cents, 'pt-PT', contract.currency || 'EUR')}</TableCell>
                        <TableCell>
                          {(() => {
                            const hourlyRate = calculateHourlyRate(contract.base_salary_cents, contract.schedule_json || {});
                            return hourlyRate > 0 ? formatCurrency(hourlyRate, 'pt-PT', contract.currency || 'EUR') : '-';
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={contract.is_active ? 'default' : 'secondary'}>
                            {contract.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate('/personal/payroll/config')}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteContract(contract)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Políticas de Horas Extras */}
        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Políticas de Horas Extras</CardTitle>
                  <CardDescription>
                    Configure as regras para cálculo de horas extras, incluindo multiplicadores e limites.
                  </CardDescription>
                </div>
                <Button onClick={() => navigate('/personal/payroll/config')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Política
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {otPolicies.length === 0 ? (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Nenhuma política de horas extras configurada. Crie políticas para automatizar o cálculo de HE.</span>
                    <Button 
                      size="sm" 
                      onClick={() => navigate('/personal/payroll/config')}
                      className="ml-4"
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Criar Primeira Política
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Multiplicador</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otPolicies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell className="font-medium">{policy.name}</TableCell>
                        <TableCell className="capitalize">{policy.ot_type}</TableCell>
                        <TableCell>{policy.multiplier}x</TableCell>
                        <TableCell>
                          <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                            {policy.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate('/personal/payroll/config')}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteOTPolicy(policy.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Férias */}
        <TabsContent value="vacations">
          <PayrollVacationsManager 
            year={new Date().getFullYear()}
            vacations={vacations}
            onVacationsChange={setVacations}
          />
        </TabsContent>

        {/* Tab: Subsídio de Alimentação */}
        <TabsContent value="meal-allowance">
          <PayrollMealAllowanceConfig 
            config={mealAllowanceConfig}
            onConfigChange={setMealAllowanceConfig}
          />
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        onClose={confirmation.close}
        onConfirm={confirmation.onConfirm}
        onCancel={confirmation.onCancel}
        title={confirmation.options.title}
        message={confirmation.options.message}
        confirmText={confirmation.options.confirmText}
        cancelText={confirmation.options.cancelText}
        variant={confirmation.options.variant}
      />
    </div>
  );
}