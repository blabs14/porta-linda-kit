import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useFamilyMembers, useUpdateMemberRole, useRemoveFamilyMember } from '../../hooks/useFamilyQuery';
import { useConfirmation } from '../../hooks/useConfirmation';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { 
  Users, 
  Shield, 
  User, 
  Eye, 
  MoreVertical, 
  Mail, 
  Calendar,
  Crown,
  Trash2,
  Edit
} from 'lucide-react';

interface FamilyMembersListProps {
  familyId: string;
  userRole: string;
}

const roleConfig = {
  admin: {
    label: 'Administrador',
    icon: Shield,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Pode gerir membros e configurações'
  },
  member: {
    label: 'Membro',
    icon: User,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Pode ver e adicionar transações'
  },
  viewer: {
    label: 'Visualizador',
    icon: Eye,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Apenas pode ver dados partilhados'
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const FamilyMembersList = ({ familyId, userRole }: FamilyMembersListProps) => {
  const { data: members = [], isLoading, error } = useFamilyMembers(familyId);
  const updateRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveFamilyMember();
  const confirmation = useConfirmation();
  const { user } = useAuth();
  const { toast } = useToast();
  

  
  const [editingMember, setEditingMember] = useState<string | null>(null);

  const canManageMembers = userRole === 'admin';
  const currentUserId = user?.id;

  const handleRoleUpdate = async (memberId: string, newRole: string) => {
    try {
      await updateRoleMutation.mutateAsync({
        familyId,
        userId: memberId,
        newRole
      });
      setEditingMember(null);
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    confirmation.confirm(
      {
        title: 'Remover membro',
        message: `Tem a certeza que deseja remover ${memberName} da família? Esta ação não pode ser desfeita.`
      },
      async () => {
        try {
          await removeMemberMutation.mutateAsync({
            familyId,
            userId: memberId
          });
        } catch (error) {
          console.error('Erro ao remover membro:', error);
        }
      }
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Garantir que members é sempre um array
  const membersArray = Array.isArray(members) ? members : [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros da Família
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
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
            <Users className="h-5 w-5" />
            Membros da Família
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600">Erro ao carregar membros da família</p>
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros da Família ({membersArray.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {membersArray.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum membro encontrado</p>
              </div>
            ) : (
              membersArray.map((member: any) => {
                const roleInfo = roleConfig[member.role as keyof typeof roleConfig];
                const RoleIcon = roleInfo?.icon || User;
                const isCurrentUser = member.user_id === currentUserId;
                const canEditThisMember = canManageMembers && !isCurrentUser;

                return (
                  <div key={member.id} className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profile?.foto_url} alt={member.profile?.nome} />
                      <AvatarFallback>
                        {member.profile?.nome ? getInitials(member.profile.nome) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">
                          {member.profile?.nome || 'Utilizador'}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">(Tu)</span>
                          )}
                        </h4>
                        {member.role === 'admin' && (
                          <Crown className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.profile?.email || 'Email não disponível'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Membro desde {formatDate(member.joined_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingMember === member.id ? (
                        <Select
                          value={member.role}
                          onValueChange={(newRole) => handleRoleUpdate(member.user_id, newRole)}
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(roleConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const Icon = config.icon;
                                    return <Icon className="h-4 w-4" />;
                                  })()}
                                  {config.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={roleInfo?.color}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleInfo?.label}
                        </Badge>
                      )}

                      {canEditThisMember && (
                        <div className="flex items-center gap-1">
                          {editingMember === member.id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingMember(null)}
                              disabled={updateRoleMutation.isPending}
                            >
                              Cancelar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingMember(member.id)}
                              disabled={updateRoleMutation.isPending}
                              aria-label="Editar membro"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveMember(member.user_id, member.profile?.nome || 'este membro')}
                            disabled={removeMemberMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            aria-label="Remover membro"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        onClose={confirmation.close}
        onConfirm={confirmation.onConfirm}
        title={confirmation.options.title}
        message={confirmation.options.message}
      />
    </>
  );
}; 