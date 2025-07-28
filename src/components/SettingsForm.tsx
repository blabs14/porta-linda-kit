import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUpdateFamilySettings } from '../hooks/useSettingsQuery';
import { settingsSchema } from '../validation/settingsSchema';
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

interface SettingsFormData {
  id?: string;
  moeda_padrao: string;
  idioma: string;
  fuso_horario: string;
  notificacoes_email: boolean;
  notificacoes_push: boolean;
  relatorios_automaticos: boolean;
  backup_automatico: boolean;
  tema: string;
  privacidade: string;
  configuracoes_avancadas?: any;
}

interface SettingsFormProps {
  familyId: string;
  initialData?: SettingsFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SettingsForm = ({ familyId, initialData, onSuccess, onCancel }: SettingsFormProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<SettingsFormData>({
    moeda_padrao: 'EUR',
    idioma: 'pt',
    fuso_horario: 'Europe/Lisbon',
    notificacoes_email: true,
    notificacoes_push: true,
    relatorios_automaticos: false,
    backup_automatico: true,
    tema: 'system',
    privacidade: 'familia',
    ...initialData
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const updateSettingsMutation = useUpdateFamilySettings();
  const isSubmitting = updateSettingsMutation.isPending;

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
    const result = settingsSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setValidationErrors(fieldErrors);
      return;
    }
    
    try {
      await updateSettingsMutation.mutateAsync({ familyId, settings: form });
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Erro ao atualizar definições:', err);
      // O erro já é tratado pelo hook useCrudMutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-2 sm:p-4 max-h-[80vh] overflow-y-auto">
      {/* Configurações Gerais */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configurações Gerais</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="moeda_padrao">Moeda Padrão</Label>
            <Select value={form.moeda_padrao} onValueChange={(value) => handleSelectChange('moeda_padrao', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar moeda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">Euro (€)</SelectItem>
                <SelectItem value="USD">Dólar ($)</SelectItem>
                <SelectItem value="GBP">Libra (£)</SelectItem>
                <SelectItem value="BRL">Real (R$)</SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.moeda_padrao && <div className="text-destructive text-sm">{validationErrors.moeda_padrao}</div>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="idioma">Idioma</Label>
            <Select value={form.idioma} onValueChange={(value) => handleSelectChange('idioma', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.idioma && <div className="text-destructive text-sm">{validationErrors.idioma}</div>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fuso_horario">Fuso Horário</Label>
          <Select value={form.fuso_horario} onValueChange={(value) => handleSelectChange('fuso_horario', value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar fuso horário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Europe/Lisbon">Lisboa (GMT+0/+1)</SelectItem>
              <SelectItem value="Europe/London">Londres (GMT+0/+1)</SelectItem>
              <SelectItem value="America/New_York">Nova Iorque (GMT-5/-4)</SelectItem>
              <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3/-2)</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.fuso_horario && <div className="text-destructive text-sm">{validationErrors.fuso_horario}</div>}
        </div>
      </div>

      {/* Configurações de Notificações */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notificações</h3>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notificacoes_email"
              name="notificacoes_email"
              checked={form.notificacoes_email}
              onChange={handleChange}
              className="rounded border-gray-300"
            />
            <Label htmlFor="notificacoes_email" className="text-sm">Notificações por Email</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notificacoes_push"
              name="notificacoes_push"
              checked={form.notificacoes_push}
              onChange={handleChange}
              className="rounded border-gray-300"
            />
            <Label htmlFor="notificacoes_push" className="text-sm">Notificações Push</Label>
          </div>
        </div>
      </div>

      {/* Configurações de Privacidade */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Privacidade</h3>
        
        <div className="space-y-2">
          <Label htmlFor="privacidade">Nível de Privacidade</Label>
          <Select value={form.privacidade} onValueChange={(value) => handleSelectChange('privacidade', value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar nível de privacidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="familia">Apenas Família</SelectItem>
              <SelectItem value="membros">Membros da Família</SelectItem>
              <SelectItem value="publico">Público</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.privacidade && <div className="text-destructive text-sm">{validationErrors.privacidade}</div>}
        </div>
      </div>

      {/* Configurações de Aparência */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Aparência</h3>
        
        <div className="space-y-2">
          <Label htmlFor="tema">Tema</Label>
          <Select value={form.tema} onValueChange={(value) => handleSelectChange('tema', value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Escuro</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.tema && <div className="text-destructive text-sm">{validationErrors.tema}</div>}
        </div>
      </div>

      {/* Configurações Avançadas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configurações Avançadas</h3>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="relatorios_automaticos"
              name="relatorios_automaticos"
              checked={form.relatorios_automaticos}
              onChange={handleChange}
              className="rounded border-gray-300"
            />
            <Label htmlFor="relatorios_automaticos" className="text-sm">Relatórios Automáticos</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="backup_automatico"
              name="backup_automatico"
              checked={form.backup_automatico}
              onChange={handleChange}
              className="rounded border-gray-300"
            />
            <Label htmlFor="backup_automatico" className="text-sm">Backup Automático</Label>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-4">
        <FormSubmitButton 
          isSubmitting={isSubmitting}
          submitText="Guardar Definições"
          submittingText="A guardar..."
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

export default SettingsForm; 