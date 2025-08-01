import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useFamily } from './FamilyProvider';
import { useConfirmation } from '../../hooks/useConfirmation';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { 
  Users, 
  Shield, 
  User, 
  Eye, 
  Mail, 
  Calendar,
  Crown,
  Trash2,
  Edit,
  Plus,
  Clock,
  Check,
  X
} from 'lucide-react';

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

const FamilyMembers: React.FC = () => {
  const { 
    members, 
    pendingInvites,
    inviteMember,
    updateMemberRole,
    removeMember,
    isLoading,
    canEdit,
    canDelete,
    myRole
  } = useFamily();
  
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const confirmation = useConfirmation();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleInviteSubmit = async () => {
    if (!inviteForm.email.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira um email válido',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteMember(inviteForm.email, inviteForm.role as 'admin' | 'member' | 'viewer');
      toast({
        title: 'Convite enviado',
        description: `Convite enviado para ${inviteForm.email}`,
      });
      setInviteForm({ email: '', role: 'member' });
      setInviteModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar convite',
        description: error.message || 'Ocorreu um erro ao enviar o convite',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleUpdate = async (memberId: string, newRole: string) => {
    try {
      await updateMemberRole(memberId, newRole as 'admin' | 'member' | 'viewer');
      setEditingMember(null);
      toast({
        title: 'Role atualizada',
        description: 'A role do membro foi atualizada com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar role',
        description: error.message || 'Ocorreu um erro ao atualizar a role',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    confirmation.confirm(
      {
        title: 'Remover membro',
        message: `Tem a certeza que deseja remover ${memberName} da família? Esta ação não pode ser desfeita.`,
        confirmText: 'Remover',
        cancelText: 'Cancelar',
        variant: 'destructive',
      },
      async () => {
        try {
          await removeMember(memberId);
          toast({
            title: 'Membro removido',
            description: `${memberName} foi removido da família`,
          });
        } catch (error: any) {
          toast({
            title: 'Erro ao remover membro',
            description: error.message || 'Ocorreu um erro ao remover o membro',
            variant: 'destructive',
          });
        }
      }
    );
  };

  const handleCancelInvite = async (inviteId: string, email: string) => {
    confirmation.confirm(
      {
        title: 'Cancelar convite',
        message: `Tem a certeza que deseja cancelar o convite para ${email}?`,
        confirmText: 'Cancelar',
        cancelText: 'Manter',
        variant: 'destructive',
      },
      async () => {
        try {
          // TODO: Implementar cancelInvite no FamilyProvider
          toast({
            title: 'Convite cancelado',
            description: `Convite para ${email} foi cancelado`,
          });
        } catch (error: any) {
          toast({
            title: 'Erro ao cancelar convite',
            description: error.message || 'Ocorreu um erro ao cancelar o convite',
            variant: 'destructive',
          });
        }
      }
    );
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      // TODO: Implementar acceptInvite no FamilyProvider
      toast({
        title: 'Convite aceite',
        description: 'Agora faz parte desta família',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao aceitar convite',
        description: error.message || 'Ocorreu um erro ao aceitar o convite',
        variant: 'destructive',
      });
    }
  };

  if (isLoading.members || (isLoading as any).pendingInvites) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">A carregar membros da família...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Membros da Família</h1>
          <p className="text-muted-foreground">
            Gerencie os membros e convites da família
          </p>
        </div>
        {canEdit('member') && (
          <Button onClick={() => setInviteModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Convidar Membro
          </Button>
        )}
      </div>

      {/* Membros Atuais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros Atuais ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum membro encontrado</p>
                {canEdit('member') && (
                  <Button 
                    variant="outline" 
                    onClick={() => setInviteModalOpen(true)}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Convidar Primeiro Membro
                  </Button>
                )}
              </div>
            ) : (
              members.map((member: any) => {
                const roleInfo = roleConfig[member.role as keyof typeof roleConfig];
                const RoleIcon = roleInfo?.icon || User;
                const isCurrentUser = member.user_id === user?.id;
                const canEditThisMember = canEdit('member') && !isCurrentUser;

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
                            >
                              Cancelar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingMember(member.id)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {canDelete('member') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveMember(member.user_id, member.profile?.nome || 'este membro')}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
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

      {/* Convites Pendentes */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Convites Pendentes ({pendingInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvites.map((invite: any) => {
                const roleInfo = roleConfig[invite.role as keyof typeof roleConfig];
                const RoleIcon = roleInfo?.icon || User;
                const isMyInvite = invite.invited_user_id === user?.id;

                return (
                  <div key={invite.id} className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(invite.email)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">
                          {invite.email}
                          {isMyInvite && (
                            <span className="ml-2 text-xs text-muted-foreground">(Convite para ti)</span>
                          )}
                        </h4>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{invite.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Convite enviado em {formatDate(invite.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={roleInfo?.color}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {roleInfo?.label}
                      </Badge>

                      {isMyInvite ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcceptInvite(invite.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Aceitar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelInvite(invite.id, invite.email)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : canEdit('member') ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelInvite(invite.id, invite.email)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Convite */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>
              Envie um convite para alguém juntar-se à família
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteForm.role} onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
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
              <p className="text-xs text-muted-foreground">
                {roleConfig[inviteForm.role as keyof typeof roleConfig]?.description}
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleInviteSubmit} 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'A enviar...' : 'Enviar Convite'}
              </Button>
              <Button variant="outline" onClick={() => setInviteModalOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
};

export default FamilyMembers; 