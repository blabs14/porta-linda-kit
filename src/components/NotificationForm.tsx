import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCreateNotification, useUpdateNotification } from '../hooks/useNotificationsQuery';
import { notificationSchema } from '../validation/notificationSchema';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FormSubmitButton } from './ui/loading-button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';

interface NotificationFormData {
  id?: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  prioridade: string;
  ativa: boolean;
}

interface NotificationFormProps {
  initialData?: NotificationFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const NotificationForm = ({ initialData, onSuccess, onCancel }: NotificationFormProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<NotificationFormData>({
    titulo: '',
    mensagem: '',
    tipo: 'info',
    prioridade: 'normal',
    ativa: true,
    ...initialData
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const createNotificationMutation = useCreateNotification();
  const updateNotificationMutation = useUpdateNotification();
  const isSubmitting = createNotificationMutation.isPending || updateNotificationMutation.isPending;

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validação client-side com Zod
    const result = notificationSchema.safeParse(form);
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
        titulo: form.titulo,
        mensagem: form.mensagem,
        tipo: form.tipo,
        prioridade: form.prioridade,
        ativa: form.ativa,
      };
      
      if (initialData && initialData.id) {
        await updateNotificationMutation.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await createNotificationMutation.mutateAsync(payload);
      }
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Erro ao guardar notificação:', err);
      // O erro já é tratado pelo hook useCrudMutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-2 sm:p-4">
      <div className="space-y-2">
        <Label htmlFor="titulo">Título</Label>
        <Input
          id="titulo"
          name="titulo"
          placeholder="Título da notificação"
          value={form.titulo}
          onChange={handleChange}
          required
          autoFocus
          aria-invalid={!!validationErrors.titulo}
          aria-describedby={validationErrors.titulo ? 'titulo-error' : undefined}
        />
        {validationErrors.titulo && <div id="titulo-error" className="text-destructive text-sm">{validationErrors.titulo}</div>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mensagem">Mensagem</Label>
        <Textarea
          id="mensagem"
          name="mensagem"
          placeholder="Conteúdo da notificação"
          value={form.mensagem}
          onChange={handleChange}
          required
          rows={3}
          aria-invalid={!!validationErrors.mensagem}
          aria-describedby={validationErrors.mensagem ? 'mensagem-error' : undefined}
        />
        {validationErrors.mensagem && <div id="mensagem-error" className="text-destructive text-sm">{validationErrors.mensagem}</div>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo</Label>
        <Select value={form.tipo} onValueChange={(value) => handleSelectChange('tipo', value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecionar tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Informação</SelectItem>
            <SelectItem value="warning">Aviso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
          </SelectContent>
        </Select>
        {validationErrors.tipo && <div className="text-destructive text-sm">{validationErrors.tipo}</div>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="prioridade">Prioridade</Label>
        <Select value={form.prioridade} onValueChange={(value) => handleSelectChange('prioridade', value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecionar prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
        {validationErrors.prioridade && <div className="text-destructive text-sm">{validationErrors.prioridade}</div>}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="ativa"
          name="ativa"
          checked={form.ativa}
          onChange={handleChange}
          className="rounded border-gray-300"
        />
        <Label htmlFor="ativa" className="text-sm">Ativa</Label>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <FormSubmitButton 
          isSubmitting={isSubmitting}
          submitText={initialData?.id ? 'Atualizar' : 'Criar'}
          submittingText={initialData?.id ? 'A atualizar...' : 'A criar...'}
          className="w-full"
        />
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="w-full">
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
};

export default NotificationForm; 