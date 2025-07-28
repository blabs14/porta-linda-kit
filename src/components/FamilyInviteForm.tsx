import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import { FormTransition } from './ui/transition-wrapper';

interface FamilyInviteFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const FamilyInviteForm = ({ onSuccess, onCancel }: FamilyInviteFormProps) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

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
      // TODO: Implementar chamada da API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulação
      
      if (onSuccess) onSuccess();
      setEmail('');
    } catch (error) {
      setValidationError('Erro ao enviar convite');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormTransition isVisible={true}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
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