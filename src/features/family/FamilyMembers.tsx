import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useFamily } from './FamilyContext';
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
  X,
  UserPlus
} from 'lucide-react';
import { Suspense } from 'react';
import { LazyConfirmationDialog, LazyFallback } from './lazy';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { getAuditLogsByRow } from '../../services/audit_logs';
type AuditEntry = { id: string; timestamp: string; operation: string; old_data?: any; new_data?: any; details?: any };

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
    myRole,
    refetchAll
  } = useFamily();
  
  // Funções para futuras implementações
  const cancelInvite = (useFamily() as any).cancelInvite;
  const acceptInvite = (useFamily() as any).acceptInvite;
  
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showCancelInviteConfirmation, setShowCancelInviteConfirmation] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string } | null>(null);
  const [inviteToCancel, setInviteToCancel] = useState<{ id: string; email: string } | null>(null);
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
        description: 'Por favor, introduza um email válido.',
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
      setInviteModalOpen(false);
      setInviteForm({ email: '', role: 'member' });
      refetchAll();
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
      toast({
        title: 'Role atualizada',
        description: 'A role do membro foi atualizada com sucesso.',
      });
      setEditingMember(null);
      refetchAll();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar role',
        description: error.message || 'Ocorreu um erro ao atualizar a role',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      await removeMember(memberId);
      toast({
        title: 'Membro removido',
        description: `${memberName} foi removido da família.`,
      });
      setShowDeleteConfirmation(false);
      setMemberToDelete(null);
      refetchAll();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover membro',
        description: error.message || 'Ocorreu um erro ao remover o membro',
        variant: 'destructive',
      });
    }
  };

  const handleCancelInvite = async (inviteId: string, email: string) => {
    try {
      await cancelInvite(inviteId);
      toast({
        title: 'Convite cancelado',
        description: `Convite para ${email} foi cancelado.`,
      });
      setShowCancelInviteConfirmation(false);
      setInviteToCancel(null);
      refetchAll();
    } catch (error: any) {
      toast({
        title: 'Erro ao cancelar convite',
        description: error.message || 'Ocorreu um erro ao cancelar o convite',
        variant: 'destructive',
      });
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await acceptInvite(inviteId);
      toast({
        title: 'Convite aceite',
        description: 'Agora faz parte desta família',
      });
      refetchAll();
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
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros da Família
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestão de membros, roles e convites da família
          </p>
        </div>
        {canEdit('member') && (
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
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
                    <UserPlus className="h-4 w-4 mr-2" />
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

                      {/* Histórico de alterações (Audit Log) */}
                      <div className="mt-3">
                        <Accordion type="single" collapsible>
                          <AccordionItem value={`hist-${member.id}`}>
                            <AccordionTrigger>Histórico</AccordionTrigger>
                            <AccordionContent>
                              <MemberAuditList memberId={member.id} />
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
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
                              aria-label="Editar membro"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {canDelete('member') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setMemberToDelete({ 
                                  id: member.user_id, 
                                  name: member.profile?.nome || 'este membro' 
                                });
                                setShowDeleteConfirmation(true);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              aria-label="Remover membro"
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
                            onClick={() => {
                              setInviteToCancel({ id: invite.id, email: invite.email });
                              setShowCancelInviteConfirmation(true);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            aria-label="Cancelar convite"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : canEdit('member') ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setInviteToCancel({ id: invite.id, email: invite.email });
                            setShowCancelInviteConfirmation(true);
                          }}
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

      {/* Modal de Confirmação de Exclusão de Membro */}
      {showDeleteConfirmation && (
        <Suspense fallback={<LazyFallback message="A carregar diálogo..." />}>
          <LazyConfirmationDialog
            open={showDeleteConfirmation}
            onOpenChange={setShowDeleteConfirmation}
            title="Remover Membro"
            description={
              memberToDelete 
                ? `Tem a certeza que deseja remover "${memberToDelete.name}" da família? Esta ação não pode ser desfeita.`
                : 'Tem a certeza que deseja remover este membro da família?'
            }
            onConfirm={() => {
              if (memberToDelete) {
                handleRemoveMember(memberToDelete.id, memberToDelete.name);
              }
            }}
          />
        </Suspense>
      )}

      {/* Modal de Confirmação de Cancelamento de Convite */}
      {showCancelInviteConfirmation && (
        <Suspense fallback={<LazyFallback message="A carregar diálogo..." />}>
          <LazyConfirmationDialog
            open={showCancelInviteConfirmation}
            onOpenChange={setShowCancelInviteConfirmation}
            title="Cancelar Convite"
            description={
              inviteToCancel 
                ? `Tem a certeza que deseja cancelar o convite para "${inviteToCancel.email}"?`
                : 'Tem a certeza que deseja cancelar este convite?'
            }
            onConfirm={() => {
              if (inviteToCancel) {
                handleCancelInvite(inviteToCancel.id, inviteToCancel.email);
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default FamilyMembers; 

const MemberAuditList: React.FC<{ memberId: string }> = ({ memberId }) => {
  const [logs, setLogs] = React.useState<AuditEntry[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [loaded, setLoaded] = React.useState<boolean>(false);

  React.useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const { data, error } = await getAuditLogsByRow('family_members', memberId, 20);
        if (!active) return;
        if (error) {
          console.debug('[MemberAuditList] erro a obter logs:', error);
          setLogs([]);
        } else {
          setLogs(Array.isArray(data) ? (data as unknown as AuditEntry[]) : []);
        }
      } catch (e) {
        console.debug('[MemberAuditList] exceção a obter logs:', e);
        setLogs([]);
      } finally {
        if (active) {
          setLoading(false);
          setLoaded(true);
        }
      }
    };
    if (!loaded) fetchLogs();
    return () => { active = false; };
  }, [memberId, loaded]);

  if (loading) return <div className="text-sm text-muted-foreground">A carregar histórico...</div>;
  if (!logs.length) return <div className="text-sm text-muted-foreground">Sem histórico recente.</div>;

  return (
    <div className="space-y-2 text-sm">
      {logs.map((log) => (
        <div key={log.id} className="rounded border p-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{new Date(log.timestamp).toLocaleString('pt-PT')}</span>
            <Badge variant="outline">{log.operation}</Badge>
          </div>
          {log.old_data && log.new_data && (
            <div className="mt-1 text-xs text-muted-foreground">
              <span>Mudanças principais: </span>
              {typeof log.old_data === 'object' && typeof log.new_data === 'object' && (
                <>
                  {('role' in log.old_data || 'role' in log.new_data) && (
                    <div>Role: {(log.old_data?.role ?? '-') } → {(log.new_data?.role ?? '-')}</div>
                  )}
                  {('status' in log.old_data || 'status' in log.new_data) && (
                    <div>Status: {(log.old_data?.status ?? '-') } → {(log.new_data?.status ?? '-')}</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}; 