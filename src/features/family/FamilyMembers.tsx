import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useFamily } from './FamilyProvider';
import { Users, Crown, Shield, User, Eye } from 'lucide-react';

const FamilyMembers: React.FC = () => {
  const { members, pendingInvites, myRole, isLoading } = useFamily();

  if (isLoading.members) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'member':
        return <User className="h-4 w-4 text-green-600" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Proprietário';
      case 'admin':
        return 'Administrador';
      case 'member':
        return 'Membro';
      case 'viewer':
        return 'Visualizador';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'member':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Membros Ativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros da Família
          </CardTitle>
          <CardDescription>
            {members.length} membros ativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum membro encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                      {(member as any).profile_nome?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium">{(member as any).profile_nome || 'Membro'}</p>
                      <p className="text-sm text-muted-foreground">
                        Membro desde {new Date((member as any).joined_at).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleIcon((member as any).role)}
                    <span className={`text-sm px-2 py-1 rounded border ${getRoleColor((member as any).role)}`}>
                      {getRoleLabel((member as any).role)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convites Pendentes */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Convites Pendentes
            </CardTitle>
            <CardDescription>
              {pendingInvites.length} convite(s) aguardando resposta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-semibold">
                      {invite.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Convite enviado em {new Date(invite.created_at).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm px-2 py-1 rounded border ${getRoleColor(invite.role)}`}>
                      {getRoleLabel(invite.role)}
                    </span>
                    <span className="text-sm text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                      Pendente
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre Permissões */}
      <Card>
        <CardHeader>
          <CardTitle>Permissões e Roles</CardTitle>
          <CardDescription>
            Entenda os diferentes níveis de acesso na família
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Proprietário</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Controlo total: pode gerir membros, alterar configurações e eliminar a família
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Administrador</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Pode convidar membros, alterar roles e gerir dados da família
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-green-600" />
                <span className="font-medium">Membro</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Pode adicionar e editar transações, objetivos e orçamentos
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Visualizador</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Apenas pode visualizar dados, sem permissão para editar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FamilyMembers; 