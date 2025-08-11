import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { usePendingInvites, useCancelFamilyInvite, useAcceptFamilyInvite } from '../../hooks/useFamilyQuery';
import { useConfirmation } from '../../hooks/useConfirmation';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { 
  Mail, 
  Clock, 
  Check, 
  X, 
  Shield, 
  User, 
  Eye,
  Calendar,
  Trash2
} from 'lucide-react';

interface PendingInvitesListProps {
  familyId?: string;
  userRole?: string;
}

const roleConfig = {
  admin: {
    label: 'Administrador',
    icon: Shield,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  member: {
    label: 'Membro',
    icon: User,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  viewer: {
    label: 'Visualizador',
    icon: Eye,
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const PendingInvitesList = ({ familyId, userRole }: PendingInvitesListProps) => {
  const { data: invites = [], isLoading, error } = usePendingInvites(familyId);
  const cancelInviteMutation = useCancelFamilyInvite();
  const acceptInviteMutation = useAcceptFamilyInvite();
  const confirmation = useConfirmation();
  const { user } = useAuth();
  const { toast } = useToast();

  const canManageInvites = userRole === 'admin';
  const currentUserId = user?.id;

  const handleCancelInvite = async (inviteId: string, email: string) => {
    confirmation.confirm(
      {
        title: 'Cancelar convite',
        message: `Tem a certeza que deseja cancelar o convite para ${email}?`
      },
      async () => {
        try {
          await cancelInviteMutation.mutateAsync(inviteId);
        } catch (error) {
          console.error('Erro ao cancelar convite:', error);
        }
      }
    );
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await acceptInviteMutation.mutateAsync(inviteId);
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
    }
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  // Garantir que invites é sempre um array
  const invitesArray = Array.isArray(invites) ? invites : [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Convites Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
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
            <Mail className="h-5 w-5" />
            Convites Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600">Erro ao carregar convites pendentes</p>
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
            <Mail className="h-5 w-5" />
            Convites Pendentes ({invitesArray.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invitesArray.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum convite pendente</p>
              </div>
            ) : (
              invitesArray.map((invite: any) => {
                const roleInfo = roleConfig[invite.role as keyof typeof roleConfig];
                const RoleIcon = roleInfo?.icon || User;
                const isOwnInvite = invite.invited_email === user?.email;
                const canCancelInvite = canManageInvites || isOwnInvite;

                return (
                  <div key={invite.id} className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={invite.invited_user?.foto_url} alt={invite.invited_email} />
                      <AvatarFallback>
                        {getInitials(invite.invited_email)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">
                          {invite.invited_email}
                          {isOwnInvite && (
                            <span className="ml-2 text-xs text-muted-foreground">(Para ti)</span>
                          )}
                        </h4>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">Convidado por: {invite.invited_by?.nome || 'Utilizador'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Enviado em {formatDate(invite.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={roleInfo?.color}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {roleInfo?.label}
                      </Badge>

                      {isOwnInvite ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptInvite(invite.id)}
                            disabled={acceptInviteMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                            aria-label="Aceitar convite"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Aceitar
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelInvite(invite.id, invite.invited_email)}
                            disabled={cancelInviteMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            aria-label="Cancelar convite"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : canCancelInvite ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelInvite(invite.id, invite.invited_email)}
                          disabled={cancelInviteMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label="Cancelar convite"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
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