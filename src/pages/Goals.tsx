import { useEffect, useState } from 'react';
import { useGoals } from '../hooks/useGoals';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  Target,
  Plus,
  TrendingUp,
  Calendar,
  PiggyBank,
  Home,
  Car,
  Plane,
  GraduationCap,
  Edit,
  MoreVertical
} from 'lucide-react';

const iconMap: Record<string, any> = {
  'Emergência': PiggyBank,
  'Habitação': Home,
  'Transporte': Car,
  'Viagem': Plane,
  'Educação': GraduationCap,
};

const priorityColors = {
  'Alta': 'bg-destructive text-destructive-foreground',
  'Média': 'bg-warning text-warning-foreground',
  'Baixa': 'bg-success text-success-foreground'
};

export default function Goals() {
  const { goals, loading, create, update } = useGoals();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<any | null>(null);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    valor_objetivo: '',
    prazo: '',
    categoria: 'Poupança'
  });
  const [saving, setSaving] = useState(false);

  const handleOpenModal = (goal?: any) => {
    if (goal) {
      setEditGoal(goal);
      setForm({
        nome: goal.nome || '',
        descricao: goal.descricao || '',
        valor_objetivo: goal.valor_objetivo?.toString() || '',
        prazo: goal.prazo || '',
        categoria: goal.categoria || 'Poupança'
      });
    } else {
      setEditGoal(null);
      setForm({
        nome: '',
        descricao: '',
        valor_objetivo: '',
        prazo: '',
        categoria: 'Poupança'
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.valor_objetivo) {
      toast({
        title: "Erro",
        description: "Nome e valor objetivo são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao,
        valor_objetivo: Number(form.valor_objetivo),
        valor_atual: editGoal?.valor_atual || 0,
        prazo: form.prazo,
        categoria: form.categoria,
        user_id: user?.id
      };

      if (editGoal) {
        await update(editGoal.id, payload, user?.id || '');
        toast({
          title: "Sucesso",
          description: "Objetivo atualizado com sucesso"
        });
      } else {
        await create(payload, user?.id || '');
        toast({
          title: "Sucesso", 
          description: "Objetivo criado com sucesso"
        });
      }
      setModalOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar objetivo",
        variant: "destructive"
      });
    }
    setSaving(false);
  };

  const handleAddValue = async (goalId: string, currentValue: number) => {
    const newValue = prompt("Quanto deseja adicionar?");
    if (newValue && !isNaN(Number(newValue))) {
      await update(goalId, { valor_atual: currentValue + Number(newValue) }, user?.id || '');
      toast({
        title: "Sucesso",
        description: "Valor adicionado com sucesso"
      });
    }
  };

  const totalSaved = goals.reduce((sum, goal) => sum + (goal.valor_atual || 0), 0);
  const totalTarget = goals.reduce((sum, goal) => sum + (goal.valor_objetivo || 0), 0);
  const completedGoals = goals.filter(goal => (goal.valor_atual || 0) >= (goal.valor_objetivo || 0)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Objetivos</h1>
          <p className="text-muted-foreground">Acompanhe o progresso das suas metas financeiras</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary-dark shadow-primary">
          <Plus className="h-4 w-4 mr-2" />
          Novo Objetivo
        </Button>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Poupado</p>
                <p className="text-2xl font-bold text-foreground">€{totalSaved.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <PiggyBank className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meta Total</p>
                <p className="text-2xl font-bold text-foreground">€{totalTarget.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-lg">
                <Target className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Concluídos</p>
                <p className="text-2xl font-bold text-foreground">{completedGoals}/{goals.length}</p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de objetivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="text-center col-span-2">A carregar...</div>
        ) : goals.length === 0 ? (
          <Card className="bg-gradient-card shadow-md">
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Ainda não tem objetivos definidos
              </h3>
              <p className="text-muted-foreground mb-6">
                Defina metas financeiras para organizar melhor as suas poupanças
              </p>
              <Button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary-dark">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Objetivo
              </Button>
            </CardContent>
          </Card>
        ) : goals.map((goal) => {
          const progress = (goal.valor_atual / goal.valor_objetivo) * 100;
          const remaining = (goal.valor_objetivo || 0) - (goal.valor_atual || 0);
          const daysUntilDeadline = goal.prazo ? Math.ceil(
            (new Date(goal.prazo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          ) : null;
          const Icon = iconMap[goal.categoria] || PiggyBank;
          return (
            <Card key={goal.id} className="bg-gradient-card shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg bg-primary/10`}>
                      <Icon className={`h-6 w-6 text-primary`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-foreground mb-1">
                        {goal.nome}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mb-2">
                        {goal.descricao}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {goal.categoria || 'Sem categoria'}
                        </Badge>
                        <Badge className={`text-xs ${priorityColors[goal.status as keyof typeof priorityColors] || ''}`}>
                          {goal.status || 'Sem prioridade'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleOpenModal(goal)}
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progresso */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">
                      €{(goal.valor_atual || 0).toLocaleString()} / €{(goal.valor_objetivo || 0).toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                {/* Detalhes */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Falta Poupar</p>
                    <p className="font-semibold text-sm text-foreground">
                      €{remaining.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Prazo</p>
                    <p className={`font-semibold text-sm flex items-center gap-1 ${
                      daysUntilDeadline !== null && daysUntilDeadline < 30 ? 'text-destructive' : 
                      daysUntilDeadline !== null && daysUntilDeadline < 90 ? 'text-warning' : 'text-foreground'
                    }`}>
                      <Calendar className="h-3 w-3" />
                      {daysUntilDeadline !== null ? `${daysUntilDeadline} dias` : 'Sem prazo'}
                    </p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => handleAddValue(goal.id, goal.valor_atual || 0)}
                    size="sm" 
                    className="flex-1 bg-primary hover:bg-primary-dark"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                  <Button 
                    onClick={() => handleOpenModal(goal)}
                    variant="outline" 
                    size="sm" 
                    className="border-border"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal para criar/editar objetivos */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editGoal ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do objetivo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição do objetivo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor Objetivo (€)</Label>
              <Input
                id="valor"
                type="number"
                value={form.valor_objetivo}
                onChange={(e) => setForm(prev => ({ ...prev, valor_objetivo: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo</Label>
              <Input
                id="prazo"
                type="date"
                value={form.prazo}
                onChange={(e) => setForm(prev => ({ ...prev, prazo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={form.categoria} onValueChange={(value) => setForm(prev => ({ ...prev, categoria: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Poupança">Poupança</SelectItem>
                  <SelectItem value="Emergência">Emergência</SelectItem>
                  <SelectItem value="Habitação">Habitação</SelectItem>
                  <SelectItem value="Transporte">Transporte</SelectItem>
                  <SelectItem value="Viagem">Viagem</SelectItem>
                  <SelectItem value="Educação">Educação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}