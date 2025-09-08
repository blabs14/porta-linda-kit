import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUpdateProfile } from '../hooks/useProfilesQuery';
import { profileSchema } from '../validation/profileSchema';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import { FormTransition } from './ui/transition-wrapper';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { logger } from '@/shared/lib/logger';

interface ProfileFormData {
  id?: string;
  nome: string;
  email: string;
  telefone?: string;
  data_nascimento?: string;
  genero?: string;
  endereco?: string;
  cidade?: string;
  codigo_postal?: string;
  pais?: string;
  bio?: string;
  avatar_url?: string;
}

interface ProfileFormProps {
  initialData?: ProfileFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ProfileForm = ({ initialData, onSuccess, onCancel }: ProfileFormProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileFormData>({
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    genero: '',
    endereco: '',
    cidade: '',
    codigo_postal: '',
    pais: 'Portugal',
    bio: '',
    avatar_url: '',
    ...initialData
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const updateProfileMutation = useUpdateProfile();
  const isSubmitting = updateProfileMutation.isPending;

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validação client-side com Zod
    const result = profileSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setValidationErrors(fieldErrors);
      return;
    }
    
    try {
      const payload = {
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        data_nascimento: form.data_nascimento,
        genero: form.genero,
        endereco: form.endereco,
        cidade: form.cidade,
        codigo_postal: form.codigo_postal,
        pais: form.pais,
        bio: form.bio,
        avatar_url: form.avatar_url,
      };
      
      await updateProfileMutation.mutateAsync({ id: user?.id || '', data: payload });
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      logger.error('Erro ao atualizar perfil:', err);
      // O erro já é tratado pelo hook useCrudMutation
    }
  };

  return (
    <FormTransition isVisible={true}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
        <div className="space-y-2">
          <label htmlFor="nome">Nome Completo</label>
          <Input
            id="nome"
            name="nome"
            placeholder="Seu nome completo"
            value={form.nome}
            onChange={handleChange}
            required
            autoFocus
            className="w-full"
            aria-invalid={!!validationErrors.nome}
            aria-describedby={validationErrors.nome ? 'nome-error' : undefined}
          />
          {validationErrors.nome && <div id="nome-error" className="text-red-600 text-sm">{validationErrors.nome}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="email">Email</label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full"
            aria-invalid={!!validationErrors.email}
            aria-describedby={validationErrors.email ? 'email-error' : undefined}
          />
          {validationErrors.email && <div id="email-error" className="text-red-600 text-sm">{validationErrors.email}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="telefone">Telefone (Opcional)</label>
          <Input
            id="telefone"
            name="telefone"
            type="tel"
            placeholder="+351 123 456 789"
            value={form.telefone}
            onChange={handleChange}
            className="w-full"
            aria-invalid={!!validationErrors.telefone}
            aria-describedby={validationErrors.telefone ? 'telefone-error' : undefined}
          />
          {validationErrors.telefone && <div id="telefone-error" className="text-red-600 text-sm">{validationErrors.telefone}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="data_nascimento">Data de Nascimento (Opcional)</label>
          <Input
            id="data_nascimento"
            name="data_nascimento"
            type="date"
            value={form.data_nascimento}
            onChange={handleChange}
            className="w-full"
            aria-invalid={!!validationErrors.data_nascimento}
            aria-describedby={validationErrors.data_nascimento ? 'data_nascimento-error' : undefined}
          />
          {validationErrors.data_nascimento && <div id="data_nascimento-error" className="text-red-600 text-sm">{validationErrors.data_nascimento}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="genero">Género (Opcional)</label>
          <Select value={form.genero} onValueChange={(value) => handleSelectChange('genero', value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar género" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="feminino">Feminino</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
              <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.genero && <div className="text-red-600 text-sm">{validationErrors.genero}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="endereco">Endereço (Opcional)</label>
          <Input
            id="endereco"
            name="endereco"
            placeholder="Rua, número, andar"
            value={form.endereco}
            onChange={handleChange}
            className="w-full"
            aria-invalid={!!validationErrors.endereco}
            aria-describedby={validationErrors.endereco ? 'endereco-error' : undefined}
          />
          {validationErrors.endereco && <div id="endereco-error" className="text-red-600 text-sm">{validationErrors.endereco}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="cidade">Cidade (Opcional)</label>
          <Input
            id="cidade"
            name="cidade"
            placeholder="Sua cidade"
            value={form.cidade}
            onChange={handleChange}
            className="w-full"
            aria-invalid={!!validationErrors.cidade}
            aria-describedby={validationErrors.cidade ? 'cidade-error' : undefined}
          />
          {validationErrors.cidade && <div id="cidade-error" className="text-red-600 text-sm">{validationErrors.cidade}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="codigo_postal">Código Postal (Opcional)</label>
          <Input
            id="codigo_postal"
            name="codigo_postal"
            placeholder="1234-567"
            value={form.codigo_postal}
            onChange={handleChange}
            className="w-full"
            aria-invalid={!!validationErrors.codigo_postal}
            aria-describedby={validationErrors.codigo_postal ? 'codigo_postal-error' : undefined}
          />
          {validationErrors.codigo_postal && <div id="codigo_postal-error" className="text-red-600 text-sm">{validationErrors.codigo_postal}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="pais">País</label>
          <Select value={form.pais} onValueChange={(value) => handleSelectChange('pais', value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar país" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Portugal">Portugal</SelectItem>
              <SelectItem value="Brasil">Brasil</SelectItem>
              <SelectItem value="Angola">Angola</SelectItem>
              <SelectItem value="Moçambique">Moçambique</SelectItem>
              <SelectItem value="Cabo Verde">Cabo Verde</SelectItem>
              <SelectItem value="Guiné-Bissau">Guiné-Bissau</SelectItem>
              <SelectItem value="São Tomé e Príncipe">São Tomé e Príncipe</SelectItem>
              <SelectItem value="Timor-Leste">Timor-Leste</SelectItem>
              <SelectItem value="Macau">Macau</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.pais && <div className="text-red-600 text-sm">{validationErrors.pais}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="bio">Biografia (Opcional)</label>
          <Textarea
            id="bio"
            name="bio"
            placeholder="Conte-nos um pouco sobre si..."
            value={form.bio}
            onChange={handleChange}
            rows={3}
            className="w-full"
            aria-invalid={!!validationErrors.bio}
            aria-describedby={validationErrors.bio ? 'bio-error' : undefined}
          />
          {validationErrors.bio && <div id="bio-error" className="text-red-600 text-sm">{validationErrors.bio}</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="avatar_url">URL do Avatar (Opcional)</label>
          <Input
            id="avatar_url"
            name="avatar_url"
            type="url"
            placeholder="https://exemplo.com/avatar.jpg"
            value={form.avatar_url}
            onChange={handleChange}
            className="w-full"
            aria-invalid={!!validationErrors.avatar_url}
            aria-describedby={validationErrors.avatar_url ? 'avatar_url-error' : undefined}
          />
          {validationErrors.avatar_url && <div id="avatar_url-error" className="text-red-600 text-sm">{validationErrors.avatar_url}</div>}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <FormSubmitButton 
            isSubmitting={isSubmitting}
            submitText="Atualizar Perfil"
            submittingText="A atualizar..."
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

export default ProfileForm;