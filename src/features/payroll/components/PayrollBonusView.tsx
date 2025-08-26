import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Separator } from '../../../components/ui/separator';
import { 
  Gift, 
  Settings, 
  Calendar, 
  Euro, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';

// Mock data - em produção, estes dados viriam de uma API/contexto
interface BonusConfig {
  id: string;
  type: 'mandatory' | 'performance';
  name: string;
  isActive: boolean;
  amount?: number;
  percentage?: number;
  frequency: string;
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  description: string;
  legalInfo?: string;
}

const mockBonusConfigs: BonusConfig[] = [
  {
    id: '1',
    type: 'mandatory',
    name: 'Subsídio de Férias',
    isActive: true,
    amount: 1200,
    frequency: 'Anual (Junho)',
    nextPaymentDate: '2025-06-30',
    lastPaymentDate: '2024-06-30',
    description: 'Subsídio obrigatório equivalente a um mês de retribuição',
    legalInfo: 'Artigo 264º do Código do Trabalho'
  },
  {
    id: '2',
    type: 'mandatory',
    name: 'Subsídio de Natal',
    isActive: true,
    amount: 1200,
    frequency: 'Anual (Dezembro)',
    nextPaymentDate: '2025-12-15',
    lastPaymentDate: '2024-12-15',
    description: 'Subsídio obrigatório equivalente a um mês de retribuição',
    legalInfo: 'Artigo 263º do Código do Trabalho'
  },
  {
    id: '3',
    type: 'performance',
    name: 'Prémio de Produtividade',
    isActive: true,
    percentage: 4.5,
    amount: 2700,
    frequency: 'Trimestral',
    nextPaymentDate: '2025-03-31',
    lastPaymentDate: '2024-12-31',
    description: 'Prémio baseado em objetivos de produtividade (4.5% do salário base)',
    legalInfo: 'Isenção fiscal até 6% do salário base (máx. €4.350/ano)'
  }
];

export function PayrollBonusView() {
  const navigate = useNavigate();
  const [bonusConfigs, setBonusConfigs] = useState<BonusConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento de dados
    const timer = setTimeout(() => {
      setBonusConfigs(mockBonusConfigs);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const activeBonuses = bonusConfigs.filter(bonus => bonus.isActive);
  const inactiveBonuses = bonusConfigs.filter(bonus => !bonus.isActive);

  const totalAnnualAmount = activeBonuses.reduce((total, bonus) => {
    if (bonus.type === 'mandatory') {
      return total + (bonus.amount || 0);
    } else if (bonus.type === 'performance' && bonus.frequency === 'Trimestral') {
      return total + (bonus.amount || 0) * 4;
    }
    return total + (bonus.amount || 0);
  }, 0);

  const formatCurrencyUtil = (amount: number) => {
    return formatCurrency(amount * 100); // formatCurrency expects cents
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getBonusIcon = (type: string) => {
    return type === 'mandatory' ? Calendar : TrendingUp;
  };

  const getBonusColor = (type: string) => {
    return type === 'mandatory' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com resumo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Bónus e Prémios Ativos</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeBonuses.length} configuração{activeBonuses.length !== 1 ? 'ões' : ''} ativa{activeBonuses.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/personal/payroll/settings/bonus')}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {formatCurrencyUtil(totalAnnualAmount)}
              </div>
              <div className="text-sm text-muted-foreground">Total Anual Estimado</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {activeBonuses.filter(b => b.type === 'mandatory').length}
              </div>
              <div className="text-sm text-muted-foreground">Subsídios Obrigatórios</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {activeBonuses.filter(b => b.type === 'performance').length}
              </div>
              <div className="text-sm text-muted-foreground">Prémios de Produtividade</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de bónus ativos */}
      {activeBonuses.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Configurações Ativas</h3>
          {activeBonuses.map((bonus) => {
            const Icon = getBonusIcon(bonus.type);
            return (
              <Card key={bonus.id} className={getBonusColor(bonus.type)}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{bonus.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {bonus.type === 'mandatory' ? 'Obrigatório' : 'Produtividade'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {bonus.description}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Euro className="h-3 w-3" />
                              <span>Valor</span>
                            </div>
                            <div className="font-medium">
                              {bonus.amount ? formatCurrencyUtil(bonus.amount) : 'N/A'}
                              {bonus.percentage && (
                                <span className="text-muted-foreground ml-1">
                                  ({bonus.percentage}%)
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Clock className="h-3 w-3" />
                              <span>Frequência</span>
                            </div>
                            <div className="font-medium">{bonus.frequency}</div>
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Calendar className="h-3 w-3" />
                              <span>Próximo Pagamento</span>
                            </div>
                            <div className="font-medium">
                              {bonus.nextPaymentDate ? formatDate(bonus.nextPaymentDate) : 'N/A'}
                            </div>
                          </div>
                        </div>
                        
                        {bonus.legalInfo && (
                          <div className="mt-3 p-2 bg-white/50 rounded text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            {bonus.legalInfo}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-green-600">Ativo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum Bónus Configurado</h3>
            <p className="text-muted-foreground mb-4">
              Configure subsídios obrigatórios e prémios de produtividade para começar.
            </p>
            <Button onClick={() => navigate('/personal/payroll/settings/bonus')}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar Bónus
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bónus inativos (se existirem) */}
      {inactiveBonuses.length > 0 && (
        <div className="space-y-4">
          <Separator />
          <h3 className="text-lg font-semibold text-muted-foreground">Configurações Inativas</h3>
          {inactiveBonuses.map((bonus) => {
            const Icon = getBonusIcon(bonus.type);
            return (
              <Card key={bonus.id} className="opacity-60">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-muted-foreground">{bonus.name}</h4>
                        <p className="text-sm text-muted-foreground">{bonus.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Inativo</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Informação legal */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Informação Legal:</strong> Os subsídios de férias e Natal são obrigatórios por lei. 
          Os prémios de produtividade têm benefícios fiscais até 6% do salário base (máximo €4.350/ano). 
          Consulte sempre um contabilista para validação fiscal.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default PayrollBonusView;