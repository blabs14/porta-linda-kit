import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import { FormTransition } from './ui/transition-wrapper';
import { useFamily } from '../features/family/FamilyContext';
import { useToast } from '../hooks/use-toast';

interface FamilyInviteFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const FamilyInviteForm = ({ onSuccess, onCancel }: FamilyInviteFormProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const { inviteMember } = useFamily();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    
    if (!email) {
      setValidationError('Email é obrigatório');
      return;
    }
    
    if (!email.includes('@')) {
      setValidationError('Email inválido');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await inviteMember(email, role);
      
      toast({
        title: 'Convite enviado',
        description: `Convite enviado para ${email} com sucesso.`,
      });
      
      if (onSuccess) onSuccess();
      setEmail('');
      setRole('member');
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao enviar convite';
      setValidationError(errorMessage);
      
      toast({
        title: 'Erro ao enviar convite',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormTransition isVisible={true}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email">Email do Membro da Família</label>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full"
              aria-invalid={!!validationError}
              aria-describedby={validationError ? 'email-error' : undefined}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="role">Papel na Família</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member' | 'viewer')}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="member">Membro</option>
              <option value="admin">Administrador</option>
              <option value="viewer">Visualizador</option>
            </select>
          </div>
          
          {validationError && <div id="email-error" className="text-red-600 text-sm">{validationError}</div>}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <FormSubmitButton 
            isSubmitting={isSubmitting}
            submitText="Enviar Convite"
            submittingText="A enviar..."
            className="w-full"
          />
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="w-full">
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </FormTransition>
  );
};

export default FamilyInviteForm;