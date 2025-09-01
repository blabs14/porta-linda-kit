import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';
import { Trash2, Plus, Edit } from 'lucide-react';
import { performanceBonusService } from '../services/performanceBonusService';
import { PerformanceBonusConfig as Config, PerformanceBonusConfigInput } from '../types/performanceBonus';
import { useToast } from '../../../hooks/use-toast';

interface PerformanceBonusConfigProps {
  contractId?: string;
}

const METRIC_TYPES = [
  { value: 'hours_worked', label: 'Horas Trabalhadas' },
  { value: 'punctuality', label: 'Pontualidade' },
  { value: 'attendance', label: 'Assiduidade' },
  { value: 'overtime_ratio', label: 'Rácio de Horas Extras' },
  { value: 'weekly_consistency', label: 'Consistência Semanal' }
];

const OPERATORS = [
  { value: '>=', label: 'Maior ou igual a' },
  { value: '>', label: 'Maior que' },
  { value: '<=', label: 'Menor ou igual a' },
  { value: '<', label: 'Menor que' },
  { value: '=', label: 'Igual a' }
];

const BONUS_TYPES = [
  { value: 'fixed_amount', label: 'Valor Fixo' },
  { value: 'percentage', label: 'Percentagem' }
];

const EVALUATION_PERIODS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' }
];

export const PerformanceBonusConfig: React.FC<PerformanceBonusConfigProps> = ({ contractId }) => {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<PerformanceBonusConfigInput>({
    bonus_name: '',
    metric_type: 'hours_worked',
    threshold_value: 0,
    threshold_operator: '>=',
    bonus_type: 'fixed_amount',
    bonus_value: 0,
    evaluation_period: 'monthly',
    is_active: true
  });

  useEffect(() => {
    loadConfigs();
  }, [contractId]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await performanceBonusService.getConfigs(contractId);
      setConfigs(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações de bónus',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (editingConfig) {
        await performanceBonusService.updateConfig(editingConfig.id, formData);
        toast({
          title: 'Sucesso',
          description: 'Configuração de bónus atualizada com sucesso'
        });
      } else {
        await performanceBonusService.createConfig(formData, contractId);
        toast({
          title: 'Sucesso',
          description: 'Configuração de bónus criada com sucesso'
        });
      }
      
      resetForm();
      loadConfigs();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configuração de bónus',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: Config) => {
    setEditingConfig(config);
    setFormData({
      bonus_name: config.bonus_name,
      metric_type: config.metric_type,
      threshold_value: config.threshold_value,
      threshold_operator: config.threshold_operator,
      bonus_type: config.bonus_type,
      bonus_value: config.bonus_value,
      max_bonus_amount: config.max_bonus_amount,
      evaluation_period: config.evaluation_period,
      is_active: config.is_active
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja eliminar esta configuração?')) return;
    
    try {
      setLoading(true);
      await performanceBonusService.deleteConfig(id);
      toast({
        title: 'Sucesso',
        description: 'Configuração eliminada com sucesso'
      });
      loadConfigs();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao eliminar configuração',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      bonus_name: '',
      metric_type: 'hours_worked',
      threshold_value: 0,
      threshold_operator: '>=',
      bonus_type: 'fixed_amount',
      bonus_value: 0,
      evaluation_period: 'monthly',
      is_active: true
    });
    setEditingConfig(null);
    setIsFormOpen(false);
  };

  const getMetricLabel = (type: string) => {
    return METRIC_TYPES.find(m => m.value === type)?.label || type;
  };

  const getOperatorLabel = (op: string) => {
    return OPERATORS.find(o => o.value === op)?.label || op;
  };

  const getBonusTypeLabel = (type: string) => {
    return BONUS_TYPES.find(b => b.value === type)?.label || type;
  };

  const getPeriodLabel = (period: string) => {
    return EVALUATION_PERIODS.find(p => p.value === period)?.label || period;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Bónus de Performance</h2>
          <p className="text-muted-foreground">
            Configure bónus automáticos baseados em métricas de performance
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Bónus
        </Button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingConfig ? 'Editar' : 'Criar'} Configuração de Bónus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bonus_name">Nome do Bónus</Label>
                  <Input
                    id="bonus_name"
                    value={formData.bonus_name}
                    onChange={(e) => setFormData({ ...formData, bonus_name: e.target.value })}
                    placeholder="Ex: Bónus de Pontualidade"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="metric_type">Métrica</Label>
                  <Select
                    value={formData.metric_type}
                    onValueChange={(value: any) => setFormData({ ...formData, metric_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRIC_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="threshold_operator">Condição</Label>
                  <Select
                    value={formData.threshold_operator}
                    onValueChange={(value: any) => setFormData({ ...formData, threshold_operator: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="threshold_value">Valor Limite</Label>
                  <Input
                    id="threshold_value"
                    type="number"
                    step="0.01"
                    value={formData.threshold_value}
                    onChange={(e) => setFormData({ ...formData, threshold_value: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="bonus_type">Tipo de Bónus</Label>
                  <Select
                    value={formData.bonus_type}
                    onValueChange={(value: any) => setFormData({ ...formData, bonus_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BONUS_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bonus_value">
                    {formData.bonus_type === 'fixed_amount' ? 'Valor (€)' : 'Percentagem (%)'}
                  </Label>
                  <Input
                    id="bonus_value"
                    type="number"
                    step="0.01"
                    value={formData.bonus_value}
                    onChange={(e) => setFormData({ ...formData, bonus_value: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="max_bonus_amount">Valor Máximo (€) - Opcional</Label>
                  <Input
                    id="max_bonus_amount"
                    type="number"
                    step="0.01"
                    value={formData.max_bonus_amount || ''}
                    onChange={(e) => setFormData({ ...formData, max_bonus_amount: parseFloat(e.target.value) || undefined })}
                  />
                </div>

                <div>
                  <Label htmlFor="evaluation_period">Período de Avaliação</Label>
                  <Select
                    value={formData.evaluation_period}
                    onValueChange={(value: any) => setFormData({ ...formData, evaluation_period: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVALUATION_PERIODS.map(period => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Ativo</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {editingConfig ? 'Atualizar' : 'Criar'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Configs List */}
      <div className="grid gap-4">
        {configs.map((config) => (
          <Card key={config.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{config.bonus_name}</h3>
                    <Badge variant={config.is_active ? 'default' : 'secondary'}>
                      {config.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>Métrica:</strong> {getMetricLabel(config.metric_type)} {getOperatorLabel(config.threshold_operator)} {config.threshold_value}
                    </p>
                    <p>
                      <strong>Bónus:</strong> {getBonusTypeLabel(config.bonus_type)} - 
                      {config.bonus_type === 'fixed_amount' ? `€${config.bonus_value}` : `${config.bonus_value}%`}
                      {config.max_bonus_amount && ` (máx: €${config.max_bonus_amount})`}
                    </p>
                    <p>
                      <strong>Período:</strong> {getPeriodLabel(config.evaluation_period)}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(config)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(config.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {configs.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Nenhuma configuração de bónus encontrada.
              <br />
              Clique em "Novo Bónus" para criar a primeira configuração.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};