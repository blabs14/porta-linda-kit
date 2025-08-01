import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FormSubmitButton } from '../ui/loading-button';
import { useInviteFamilyMember } from '../../hooks/useFamilyQuery';
import { useToast } from '../../hooks/use-toast';
import { Mail, Shield, Users, Eye, Crown } from 'lucide-react';

interface FamilyInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  familyName: string;
}

const roleOptions = [
  {
    value: 'admin',
    label: 'Administrador',
    description: 'Pode gerir membros e configurações',
    icon: Shield,
    color: 'text-blue-600'
  },
  {
    value: 'member',
    label: 'Membro',
    description: 'Pode ver e adicionar transações',
    icon: Users,
    color: 'text-green-600'
  },
  {
    value: 'viewer',
    label: 'Visualizador',
    description: 'Apenas pode ver dados partilhados',
    icon: Eye,
    color: 'text-gray-600'
  }
];

export const FamilyInviteModal = ({ isOpen, onClose, familyId, familyName }: FamilyInviteModalProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [validationError, setValidationError] = useState('');
  
  const inviteMutation = useInviteFamilyMember();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    
    // Validação
    if (!email.trim()) {
      setValidationError('Email é obrigatório');
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setValidationError('Email inválido');
      return;
    }
    
    if (!role) {
      setValidationError('Selecione um role');
      return;
    }
    
    try {
      await inviteMutation.mutateAsync({
        familyId,
        email: email.trim(),
        role
      });
      
      // Limpar formulário
      setEmail('');
      setRole('member');
      setValidationError('');
      onClose();
      
    } catch (error) {
      // Erro já tratado no hook
      console.error('Erro ao enviar convite:', error);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    setValidationError('');
    onClose();
  };

  const selectedRole = roleOptions.find(r => r.value === role);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Convidar para {familyName}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do convidado</Label>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              disabled={inviteMutation.isPending}
            />
            {validationError && (
              <p className="text-sm text-red-600">{validationError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role na família</Label>
            <Select value={role} onValueChange={setRole} disabled={inviteMutation.isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${option.color}`} />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedRole && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                {(() => {
                  const Icon = selectedRole.icon;
                  return <Icon className={`h-4 w-4 ${selectedRole.color}`} />;
                })()}
                <span className="font-medium">{selectedRole.label}</span>
              </div>
              <p className="text-sm text-muted-foreground">{selectedRole.description}</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={inviteMutation.isPending}
            >
              Cancelar
            </Button>
            <FormSubmitButton
              isSubmitting={inviteMutation.isPending}
              submitText="Enviar Convite"
              submittingText="A enviar..."
              className="min-w-[120px]"
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 