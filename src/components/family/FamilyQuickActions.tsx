import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Users, 
  Mail, 
  Settings, 
  Plus, 
  Share2, 
  Target,
  BarChart3,
  Calendar,
  Bell,
  Shield
} from 'lucide-react';

interface FamilyQuickActionsProps {
  familyId: string;
  familyName: string;
  userRole: string;
  onInviteMember: () => void;
  onViewStatistics: () => void;
  onManageSettings: () => void;
  memberCount: number;
  pendingInvitesCount: number;
  sharedGoalsCount: number;
}

export const FamilyQuickActions = ({
  familyId,
  familyName,
  userRole,
  onInviteMember,
  onViewStatistics,
  onManageSettings,
  memberCount,
  pendingInvitesCount,
  sharedGoalsCount
}: FamilyQuickActionsProps) => {
  const isAdmin = userRole === 'admin' || userRole === 'owner';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Convidar Membro */}
          {isAdmin && (
            <Button
              onClick={onInviteMember}
              className="h-auto p-4 flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="h-6 w-6" />
              <span className="font-medium">Convidar Membro</span>
              <span className="text-xs opacity-90">Adicionar nova pessoa</span>
            </Button>
          )}

          {/* Ver Estatísticas */}
          <Button
            onClick={onViewStatistics}
            variant="outline"
            className="h-auto p-4 flex flex-col items-center gap-2"
          >
            <BarChart3 className="h-6 w-6" />
            <span className="font-medium">Ver Estatísticas</span>
            <span className="text-xs opacity-90">Análise da família</span>
          </Button>

          {/* Configurações */}
          {isAdmin && (
            <Button
              onClick={onManageSettings}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Settings className="h-6 w-6" />
              <span className="font-medium">Configurações</span>
              <span className="text-xs opacity-90">Gerir família</span>
            </Button>
          )}

          {/* Partilhar Objetivo */}
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-center gap-2"
          >
            <Share2 className="h-6 w-6" />
            <span className="font-medium">Partilhar Objetivo</span>
            <span className="text-xs opacity-90">Criar objetivo familiar</span>
          </Button>

          {/* Ver Calendário */}
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-center gap-2"
          >
            <Calendar className="h-6 w-6" />
            <span className="font-medium">Calendário</span>
            <span className="text-xs opacity-90">Eventos da família</span>
          </Button>

          {/* Notificações */}
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-center gap-2"
          >
            <Bell className="h-6 w-6" />
            <span className="font-medium">Notificações</span>
            <span className="text-xs opacity-90">Configurar alertas</span>
          </Button>
        </div>

        {/* Resumo Rápido */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Resumo da Família
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{memberCount}</div>
              <p className="text-sm text-muted-foreground">Membros</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{pendingInvitesCount}</div>
              <p className="text-sm text-muted-foreground">Convites</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{sharedGoalsCount}</div>
              <p className="text-sm text-muted-foreground">Objetivos</p>
            </div>
          </div>
        </div>

        {/* Status do Utilizador */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Seu Role:</span>
              <Badge variant="outline" className={
                userRole === 'owner' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                userRole === 'admin' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-green-100 text-green-800 border-green-200'
              }>
                {userRole === 'owner' ? 'Proprietário' :
                 userRole === 'admin' ? 'Administrador' :
                 userRole === 'member' ? 'Membro' : 'Visualizador'}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {isAdmin ? 'Pode gerir a família' : 'Acesso limitado'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 