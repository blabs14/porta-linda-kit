import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCreateReminder, useUpdateReminder } from '../hooks/useRemindersQuery';
import { reminderSchema } from '../validation/reminderSchema';
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

interface ReminderFormData {
  id?: string;
  titulo: string;
  descricao?: string;
  data_lembrete: string;
  hora_lembrete?: string;
  repetir: string;
  ativo: boolean;
}

interface ReminderFormProps {
  initialData?: ReminderFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ReminderForm = ({ initialData, onSuccess, onCancel }: ReminderFormProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<ReminderFormData>({
    titulo: '',
    descricao: '',
    data_lembrete: new Date().toISOString().split('T')[0],
    hora_lembrete: '09:00',
    repetir: 'nenhuma',
    ativo: true,
    ...initialData
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const createReminderMutation = useCreateReminder();
  const updateReminderMutation = useUpdateReminder();
  const isSubmitting = createReminderMutation.isPending || updateReminderMutation.isPending;

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
    const result = reminderSchema.safeParse(form);
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
        descricao: form.descricao,
        data_lembrete: form.data_lembrete,
        hora_lembrete: form.hora_lembrete,
        repetir: form.repetir,
        ativo: form.ativo,
      };
      
      if (initialData && initialData.id) {
        await updateReminderMutation.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await createReminderMutation.mutateAsync(payload);
      }
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Erro ao guardar lembrete:', err);
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
          placeholder="Título do lembrete"
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
        <Label htmlFor="descricao">Descrição (Opcional)</Label>
        <Textarea
          id="descricao"
          name="descricao"
          placeholder="Descrição detalhada do lembrete"
          value={form.descricao}
          onChange={handleChange}
          rows={3}
          aria-invalid={!!validationErrors.descricao}
          aria-describedby={validationErrors.descricao ? 'descricao-error' : undefined}
        />
        {validationErrors.descricao && <div id="descricao-error" className="text-destructive text-sm">{validationErrors.descricao}</div>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data_lembrete">Data</Label>
          <Input
            id="data_lembrete"
            name="data_lembrete"
            type="date"
            value={form.data_lembrete}
            onChange={handleChange}
            required
            aria-invalid={!!validationErrors.data_lembrete}
            aria-describedby={validationErrors.data_lembrete ? 'data_lembrete-error' : undefined}
          />
          {validationErrors.data_lembrete && <div id="data_lembrete-error" className="text-destructive text-sm">{validationErrors.data_lembrete}</div>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="hora_lembrete">Hora</Label>
          <Input
            id="hora_lembrete"
            name="hora_lembrete"
            type="time"
            value={form.hora_lembrete}
            onChange={handleChange}
            aria-invalid={!!validationErrors.hora_lembrete}
            aria-describedby={validationErrors.hora_lembrete ? 'hora_lembrete-error' : undefined}
          />
          {validationErrors.hora_lembrete && <div id="hora_lembrete-error" className="text-destructive text-sm">{validationErrors.hora_lembrete}</div>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="repetir">Repetir</Label>
        <Select value={form.repetir} onValueChange={(value) => handleSelectChange('repetir', value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecionar frequência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhuma">Não repetir</SelectItem>
            <SelectItem value="diario">Diário</SelectItem>
            <SelectItem value="semanal">Semanal</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="anual">Anual</SelectItem>
          </SelectContent>
        </Select>
        {validationErrors.repetir && <div className="text-destructive text-sm">{validationErrors.repetir}</div>}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="ativo"
          name="ativo"
          checked={form.ativo}
          onChange={handleChange}
          className="rounded border-gray-300"
        />
        <Label htmlFor="ativo" className="text-sm">Ativo</Label>
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

export default ReminderForm; 