'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Utensils, Calendar, Award, Euro, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useActiveContract } from '../hooks/useActiveContract';
import { useNavigate } from 'react-router-dom';
import { payrollService } from '@/features/payroll/services/payrollService';
import { logger } from '@/shared/lib/logger';
import { subsidyService } from '../../../services/subsidyService';
import { subsidyDatabaseService } from '../../../services/subsidyDatabaseService';
import { useAuth } from '../../../contexts/AuthContext';

interface SubsidyData {
  mealAllowance: {
    dailyAmount: number;
    monthlyEstimate: number;
    isActive: boolean;
  };
  vacationBonus: {
    amount: number;
    percentage: number;
    isActive: boolean;
  };
  christmasBonus: {
    amount: number;
    percentage: number;
    isActive: boolean;
  };
}

export default function PayrollSubsidiesViewPage() {
  const { activeContract } = useActiveContract();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subsidyData, setSubsidyData] = useState<SubsidyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSubsidyData = async () => {
      logger.debug('PayrollSubsidiesViewPage - activeContract:', activeContract);
      logger.debug('PayrollSubsidiesViewPage - activeContract?.id:', activeContract?.id);
      logger.debug('PayrollSubsidiesViewPage - user:', user);
      
      if (!activeContract?.id) {
        logger.warn('PayrollSubsidiesViewPage - Nenhum contrato ativo encontrado');
        setIsLoading(false);
        return;
      }

      if (!user) {
        logger.warn('PayrollSubsidiesViewPage - Utilizador não autenticado');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        logger.debug('PayrollSubsidiesViewPage - Carregando dados para userId:', user.id, 'contractId:', activeContract.id);
        
        // Load subsidy configurations from database
        const subsidyConfigs = await subsidyDatabaseService.loadSubsidyConfigs(user.id);
        
        // Filter configs for the active contract
        const contractSubsidies = subsidyConfigs.filter(config => config.contract_id === activeContract.id);
        
        // Transform configs to SubsidyData format
        const mealAllowanceConfig = contractSubsidies.find(config => config.subsidy_type === 'meal_allowance');
        const vacationBonusConfig = contractSubsidies.find(config => config.subsidy_type === 'vacation_bonus');
        const christmasBonusConfig = contractSubsidies.find(config => config.subsidy_type === 'christmas_bonus');
        
        const subsidyData: SubsidyData = {
          mealAllowance: {
            dailyAmount: mealAllowanceConfig?.daily_amount || 0,
            monthlyEstimate: mealAllowanceConfig?.monthly_amount || 0,
            isActive: mealAllowanceConfig?.is_active || false
          },
          vacationBonus: {
            amount: vacationBonusConfig?.annual_amount || 0,
            percentage: vacationBonusConfig?.salary_percentage || 0,
            isActive: vacationBonusConfig?.is_active || false
          },
          christmasBonus: {
            amount: christmasBonusConfig?.annual_amount || 0,
            percentage: christmasBonusConfig?.salary_percentage || 0,
            isActive: christmasBonusConfig?.is_active || false
          }
        };
        
        setSubsidyData(subsidyData);
        setError(null);
        logger.info('PayrollSubsidiesViewPage - Subsídios carregados com sucesso');
      } catch (err) {
        logger.error('PayrollSubsidiesViewPage - Erro ao carregar subsídios:', err);
        setError('Erro ao carregar dados dos subsídios');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubsidyData();
  }, [activeContract?.id, user?.id]);

  const handleConfigureSubsidies = () => {
    navigate('/personal/payroll/config?tab=subsidies');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Visualização de Subsídios</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Visualização de Subsídios</h1>
        <Button onClick={handleConfigureSubsidies} variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configurar
        </Button>
      </div>
      

      
      <div className="grid gap-6 md:grid-cols-3">
        {/* Subsídio de Alimentação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Utensils className="h-5 w-5 text-orange-500" />
              Subsídio de Alimentação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-bold text-orange-600">
                    {subsidyData?.mealAllowance.dailyAmount.toFixed(2)}€
                  </span>
                  <Badge variant={subsidyData?.mealAllowance.isActive ? "default" : "secondary"}>
                    {subsidyData?.mealAllowance.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Por dia trabalhado</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm font-medium">Estimativa mensal:</p>
                <p className="text-lg font-semibold text-orange-600">
                  {subsidyData?.mealAllowance.monthlyEstimate.toFixed(2)}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subsídio de Férias */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-blue-500" />
              Subsídio de Férias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-bold text-blue-600">
                    {subsidyData?.vacationBonus.amount.toFixed(0)}€
                  </span>
                  <Badge variant={subsidyData?.vacationBonus.isActive ? "default" : "secondary"}>
                    {subsidyData?.vacationBonus.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Valor anual</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm font-medium">Percentagem do salário:</p>
                <p className="text-lg font-semibold text-blue-600">
                  {subsidyData?.vacationBonus.percentage}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subsídio de Natal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5 text-green-500" />
              Subsídio de Natal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-bold text-green-600">
                    {subsidyData?.christmasBonus.amount.toFixed(0)}€
                  </span>
                  <Badge variant={subsidyData?.christmasBonus.isActive ? "default" : "secondary"}>
                    {subsidyData?.christmasBonus.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Valor anual</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm font-medium">Percentagem do salário:</p>
                <p className="text-lg font-semibold text-green-600">
                  {subsidyData?.christmasBonus.percentage}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Total */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Resumo Anual de Subsídios
          </CardTitle>
          <CardDescription>
            Valor total estimado dos subsídios para o ano corrente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Alimentação</p>
              <p className="text-xl font-bold text-orange-600">
                {((subsidyData?.mealAllowance.monthlyEstimate || 0) * 12).toFixed(0)}€
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Férias</p>
              <p className="text-xl font-bold text-blue-600">
                {subsidyData?.vacationBonus.amount.toFixed(0)}€
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Natal</p>
              <p className="text-xl font-bold text-green-600">
                {subsidyData?.christmasBonus.amount.toFixed(0)}€
              </p>
            </div>
            <div className="text-center border-l">
              <p className="text-sm font-medium text-muted-foreground">Total Anual</p>
              <p className="text-2xl font-bold">
                {(
                  ((subsidyData?.mealAllowance.monthlyEstimate || 0) * 12) +
                  (subsidyData?.vacationBonus.amount || 0) +
                  (subsidyData?.christmasBonus.amount || 0)
                ).toFixed(0)}€
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}