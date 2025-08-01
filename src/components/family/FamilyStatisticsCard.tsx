import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useFamilyStatistics } from '../../hooks/useFamilyQuery';
import { 
  Users, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Calendar,
  DollarSign,
  PiggyBank
} from 'lucide-react';

interface FamilyStatisticsCardProps {
  familyId: string;
}

export const FamilyStatisticsCard = ({ familyId }: FamilyStatisticsCardProps) => {
  const { data: statistics, isLoading, error } = useFamilyStatistics(familyId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estatísticas da Família
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estatísticas da Família
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-600">Erro ao carregar estatísticas</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = statistics || {
    totalMembers: 0,
    activeMembers: 0,
    totalFamilySpent: 0,
    totalFamilySaved: 0
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Estatísticas da Família
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalMembers}
            </div>
            <p className="text-sm text-muted-foreground">Membros Totais</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.activeMembers}
            </div>
            <p className="text-sm text-muted-foreground">Membros Ativos</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {stats.totalFamilySpent.toLocaleString('pt-PT', {
                style: 'currency',
                currency: 'EUR'
              })}
            </div>
            <p className="text-sm text-muted-foreground">Total Gastos</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalFamilySaved.toLocaleString('pt-PT', {
                style: 'currency',
                currency: 'EUR'
              })}
            </div>
            <p className="text-sm text-muted-foreground">Total Poupanças</p>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Família Ativa</p>
                <p className="text-xs text-muted-foreground">
                  Desde {new Date().toLocaleDateString('pt-PT')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <PiggyBank className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-sm">Objetivos Partilhados</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalFamilySaved > 0 ? 'Com poupanças ativas' : 'Nenhum objetivo ativo'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 