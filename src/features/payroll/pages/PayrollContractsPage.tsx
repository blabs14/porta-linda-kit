import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { logger } from '@/shared/lib/logger';
import { useToast } from '../../../hooks/use-toast';
import { Trash2, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import { payrollService } from '../services/payrollService';
import type { PayrollContract } from '../types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog';

const PayrollContractsPage: React.FC = () => {
  const { toast } = useToast();
  const { user, session } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [contracts, setContracts] = useState<PayrollContract[]>([]);
  const [deletingContractId, setDeletingContractId] = useState<string | null>(null);

  const loadContracts = async () => {
    logger.debug('🔍 PayrollContractsPage: Carregando contratos...', {
      hasUser: !!user,
      userId: user?.id,
      hasSession: !!session
    });
    
    if (!user || !session) {
      logger.warn('❌ PayrollContractsPage: Utilizador não autenticado ou sem sessão', {
        hasUser: !!user,
        hasSession: !!session
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Verificar se a sessão ainda é válida
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !currentSession) {
        logger.error('❌ PayrollContractsPage: Sessão inválida ou expirada', { sessionError });
        toast({
          title: 'Sessão Expirada',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });
        return;
      }
      
      logger.debug('📞 PayrollContractsPage: Chamando payrollService.getContracts com userId:', user.id);
      const contractsData = await payrollService.getContracts(user.id);
      logger.debug('✅ PayrollContractsPage: Contratos carregados:', contractsData);
      setContracts(contractsData);
    } catch (error) {
      logger.error('❌ PayrollContractsPage: Erro ao carregar contratos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os contratos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Utilizador não autenticado.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setDeletingContractId(contractId);
      await payrollService.deleteContract(contractId, user.id);
      
      toast({
        title: 'Sucesso',
        description: 'Contrato eliminado com sucesso.',
      });
      
      // Recarregar a lista de contratos
      await loadContracts();
    } catch (error) {
      logger.error('Erro ao eliminar contrato:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível eliminar o contrato.',
        variant: 'destructive',
      });
    } finally {
      setDeletingContractId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  const getContractStatus = (contract: PayrollContract) => {
    if (contract.is_active) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Ativo
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          Inativo
        </Badge>
      );
    }
  };

  const getContractDuration = (contract: PayrollContract) => {
    if (contract.duration === 'permanent') {
      return 'Permanente';
    } else if (contract.duration && contract.duration !== 'permanent') {
      return `${contract.duration} meses`;
    }
    return 'N/A';
  };

  useEffect(() => {
    loadContracts();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">A carregar contratos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-600 mt-1">
            Visualize e gira os seus contratos de trabalho
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum contrato encontrado
            </h3>
            <p className="text-gray-600 text-center">
              Ainda não tem contratos criados. Use o seletor de contratos para criar um novo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {contracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        {contract.name || contract.job_category || 'Nome não definido'}
                      </CardTitle>
                      {getContractStatus(contract)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {contract.job_category && contract.workplace_location 
                        ? `${contract.job_category} - ${contract.workplace_location}`
                        : contract.job_category || contract.workplace_location || 'Detalhes não definidos'
                      }
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={deletingContractId === contract.id}
                      >
                        {deletingContractId === contract.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Contrato</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem a certeza que pretende eliminar este contrato? Esta ação não pode ser desfeita.
                          Todos os dados associados ao contrato (tempos de trabalho, férias, etc.) serão também eliminados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteContract(contract.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Salário Base</p>
                    <p className="text-lg font-semibold">
                      {contract.base_salary_cents 
                        ? formatCurrency(contract.base_salary_cents / 100)
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Horas Semanais</p>
                    <p className="text-lg font-semibold">
                      {contract.weekly_hours ? `${contract.weekly_hours}h` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Duração</p>
                    <p className="text-lg font-semibold">
                      {getContractDuration(contract)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Data de Início</p>
                    <p className="text-lg font-semibold">
                      {formatDate(contract.start_date)}
                    </p>
                  </div>
                </div>
                
                {contract.has_probation_period && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>Período Experimental:</strong> {contract.probation_duration_days || 0} dias
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PayrollContractsPage;