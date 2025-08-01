import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { 
  Settings, 
  Users, 
  Shield, 
  Bell, 
  Palette, 
  Trash2, 
  Edit,
  Save,
  AlertTriangle,
  FileText,
  Download,
  Database
} from 'lucide-react';
import { useFamily } from './FamilyProvider';
import { useToast } from '../../hooks/use-toast';
import { useConfirmation } from '../../hooks/useConfirmation';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { exportFamilyReport } from '../../services/familyExportService';
import { 
  getFamilyBackups, 
  createFamilyBackup, 
  deleteFamilyBackup, 
  downloadFamilyBackup,
  formatFileSize,
  formatBackupDate,
  getBackupStatusColor,
  getBackupStatusText,
  type FamilyBackup
} from '../../services/familyBackupService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

const FamilySettings: React.FC = () => {
  const familyContext = useFamily();
  const { 
    family,
    updateFamily,
    isLoading,
    canEdit,
    canDelete,
    myRole
  } = familyContext;
  
  // Funções para futuras implementações
  const deleteFamily = (familyContext as any).deleteFamily;
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: '',
    description: ''
  });
  const [exportForm, setExportForm] = useState({
    format: 'pdf' as 'pdf' | 'csv' | 'excel',
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    includeMembers: true,
    includeBudgets: true,
    includeGoals: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [backups, setBackups] = useState<FamilyBackup[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const { toast } = useToast();
  const confirmation = useConfirmation();

  // Carregar backups quando family carrega
  React.useEffect(() => {
    if (family?.id) {
      loadBackups();
    }
  }, [family?.id]);

  // Inicializar formulário quando family carrega
  React.useEffect(() => {
    if (family) {
      setEditForm({
        nome: family.nome || '',
        description: family.description || ''
      });
    }
  }, [family]);

  const loadBackups = async () => {
    if (!family?.id) return;
    
    setIsLoadingBackups(true);
    try {
      const backupsData = await getFamilyBackups(family.id);
      setBackups(backupsData);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar backups',
        description: error.message || 'Não foi possível carregar os backups',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!family?.id) return;

    setIsCreatingBackup(true);
    try {
      await createFamilyBackup(family.id, {
        backup_type: 'full',
        metadata: { created_by: 'user_interface' }
      });
      
      toast({
        title: 'Backup Criado',
        description: 'O backup da família foi criado com sucesso',
      });
      
      // Recarregar backups
      await loadBackups();
    } catch (error: any) {
      toast({
        title: 'Erro ao Criar Backup',
        description: error.message || 'Não foi possível criar o backup',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async (backup: FamilyBackup) => {
    try {
      await downloadFamilyBackup(backup);
      toast({
        title: 'Download Iniciado',
        description: 'O download do backup foi iniciado',
      });
    } catch (error: any) {
      toast({
        title: 'Erro no Download',
        description: error.message || 'Não foi possível fazer o download',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    confirmation.confirm(
      {
        title: 'Eliminar Backup',
        message: 'Tem a certeza que deseja eliminar este backup? Esta ação não pode ser desfeita.',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'destructive',
      },
      async () => {
        try {
          await deleteFamilyBackup(backupId);
          toast({
            title: 'Backup Eliminado',
            description: 'O backup foi eliminado com sucesso',
          });
          await loadBackups();
        } catch (error: any) {
          toast({
            title: 'Erro ao Eliminar',
            description: error.message || 'Não foi possível eliminar o backup',
            variant: 'destructive',
          });
        }
      }
    );
  };

  const handleEditSubmit = async () => {
    if (!editForm.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome da família é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateFamily({
        nome: editForm.nome,
        description: editForm.description
      });
      toast({
        title: 'Família atualizada',
        description: 'As informações da família foram atualizadas com sucesso',
      });
      setEditModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar família',
        description: error.message || 'Ocorreu um erro ao atualizar a família',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportReport = async () => {
    if (!family?.id) return;

    setIsExporting(true);
    try {
      const { blob, filename } = await exportFamilyReport(family.id, exportForm);
      
      // Criar link de download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Relatório Exportado',
        description: 'O relatório foi exportado com sucesso',
      });
      setExportModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao Exportar',
        description: error.message || 'Ocorreu um erro ao exportar o relatório',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };



  const handleDeleteFamily = async () => {
    confirmation.confirm(
      {
        title: 'Eliminar Família',
        message: `Tem a certeza que deseja eliminar a família "${family?.nome}"? Esta ação não pode ser desfeita e todos os dados partilhados serão perdidos.`,
        confirmText: 'Eliminar Família',
        cancelText: 'Cancelar',
        variant: 'destructive',
      },
      async () => {
        try {
          await deleteFamily();
          toast({
            title: 'Família eliminada',
            description: 'A família foi eliminada com sucesso',
          });
          setDeleteModalOpen(false);
        } catch (error: any) {
          toast({
            title: 'Erro ao eliminar família',
            description: error.message || 'Ocorreu um erro ao eliminar a família',
            variant: 'destructive',
          });
        }
      }
    );
  };

  if (isLoading.family) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">A carregar configurações da família...</p>
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
          <h1 className="text-3xl font-bold">Configurações da Família</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações e permissões da família
          </p>
        </div>
      </div>

      {/* Informações da Família */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Informações da Família
          </CardTitle>
          <CardDescription>
            Dados básicos e descrição da família
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <h3 className="font-medium">{family?.nome || 'Nome da Família'}</h3>
              <p className="text-sm text-muted-foreground">
                {family?.description || 'Sem descrição'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Criada em {family?.created_at ? new Date(family.created_at).toLocaleDateString('pt-PT') : 'Data desconhecida'}
              </p>
            </div>
            {(canEdit as any)('family') && (
              <Button variant="outline" onClick={() => setEditModalOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Permissões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões e Acesso
          </CardTitle>
          <CardDescription>
            Configure quem pode fazer o quê na família
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-medium">Permissões de Membro</h3>
                <p className="text-sm text-muted-foreground">
                  Configurar o que os membros podem fazer
                </p>
              </div>
            </div>
            <Button variant="outline" disabled={!(canEdit as any)('family')}>
              Configurar
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-medium">Aprovação de Transações</h3>
                <p className="text-sm text-muted-foreground">
                  Exigir aprovação para transações acima de um valor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch disabled={!(canEdit as any)('family')} />
              <span className="text-sm text-muted-foreground">Ativado</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-medium">Visibilidade de Dados</h3>
                <p className="text-sm text-muted-foreground">
                  Controlar quem pode ver dados financeiros
                </p>
              </div>
            </div>
            <Button variant="outline" disabled={!(canEdit as any)('family')}>
              Configurar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações da Família
          </CardTitle>
          <CardDescription>
            Configure alertas e notificações para a família
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-medium">Alertas de Orçamento</h3>
                <p className="text-sm text-muted-foreground">
                  Notificar quando orçamentos são excedidos
                </p>
              </div>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-medium">Novos Membros</h3>
                <p className="text-sm text-muted-foreground">
                  Notificar quando alguém se junta à família
                </p>
              </div>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-medium">Transações Grandes</h3>
                <p className="text-sm text-muted-foreground">
                  Alertar sobre transações acima de um valor
                </p>
              </div>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência da Família
          </CardTitle>
          <CardDescription>
            Personalize a aparência da área familiar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-medium">Tema da Família</h3>
                <p className="text-sm text-muted-foreground">
                  Escolher cores e estilo para a família
                </p>
              </div>
            </div>
            <Button variant="outline">Personalizar</Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-medium">Layout do Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Configurar a disposição dos elementos
                </p>
              </div>
            </div>
            <Button variant="outline">Configurar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Zona de Perigo */}
             {(canDelete as any)('family') && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription className="text-red-700">
              Ações irreversíveis que afetam toda a família
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-white">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-medium text-red-800">Eliminar Família</h3>
                  <p className="text-sm text-red-700">
                    Esta ação eliminará permanentemente a família e todos os dados partilhados
                  </p>
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => setDeleteModalOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Família
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre Finanças Partilhadas */}
      <Card>
        <CardHeader>
          <CardTitle>Acerca das Finanças Partilhadas</CardTitle>
          <CardDescription>
            Informações sobre esta funcionalidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Diferença entre Área Pessoal e Finanças Partilhadas</h4>
            <p className="text-sm text-blue-700">
              A <strong>Área Pessoal</strong> concentra todas as suas informações financeiras individuais 
              (contas, objetivos, transações) onde <code>family_id IS NULL</code>. 
              As <strong>Finanças Partilhadas</strong> mostram dados partilhados entre membros da família 
              onde <code>family_id IS NOT NULL</code>.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Funcionalidades Disponíveis</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Gestão de contas bancárias partilhadas</li>
              <li>• Objetivos financeiros familiares</li>
              <li>• Orçamentos mensais partilhados</li>
              <li>• Transações familiares</li>
              <li>• Gestão de membros e convites</li>
              <li>• Configurações de permissões</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Sua Role Atual</h4>
            <p className="text-sm text-yellow-700">
              Você tem a role de <strong>{myRole}</strong> nesta família, o que determina 
              as suas permissões e capacidades de gestão.
            </p>
          </div>

          {/* Botão de Exportação */}
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2">Exportar Relatórios</h4>
            <p className="text-sm text-purple-700 mb-3">
              Exporte relatórios detalhados da família em PDF, CSV ou Excel.
            </p>
            <Button 
              onClick={() => setExportModalOpen(true)}
              variant="outline"
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              Exportar Relatório Familiar
            </Button>
          </div>

          {/* Seção de Backup */}
          <div className="p-4 bg-orange-50 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2">Backup de Dados</h4>
            <p className="text-sm text-orange-700 mb-3">
              Crie e gerencie backups completos dos dados da família.
            </p>
            
            {/* Botão Criar Backup */}
            <Button 
              onClick={handleCreateBackup}
              disabled={isCreatingBackup || !(canEdit as any)('family')}
              variant="outline"
              className="w-full mb-3"
            >
              {isCreatingBackup ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                  A criar backup...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Criar Novo Backup
                </>
              )}
            </Button>

            {/* Lista de Backups */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-orange-800">Backups Disponíveis</h5>
              {isLoadingBackups ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-xs text-orange-600 mt-2">A carregar backups...</p>
                </div>
              ) : backups.length === 0 ? (
                <p className="text-xs text-orange-600 text-center py-4">
                  Nenhum backup disponível
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {backups.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getBackupStatusColor(backup.status)}`}>
                            {getBackupStatusText(backup.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatBackupDate(backup.created_at || '')}
                          </span>
                        </div>
                        {backup.file_size && (
                          <p className="text-xs text-gray-400 mt-1">
                            {formatFileSize(backup.file_size)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {backup.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadBackup(backup)}
                            className="h-6 w-6 p-0"
                            title="Descarregar"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        {(canDelete as any)('family') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBackup(backup.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Família</DialogTitle>
            <DialogDescription>
              Atualize as informações básicas da família
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Família</Label>
              <Input
                id="nome"
                value={editForm.nome}
                onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome da família"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional da família"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleEditSubmit} 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    A guardar...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Exportação */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Relatório Familiar</DialogTitle>
            <DialogDescription>
              Configure as opções de exportação do relatório
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="format">Formato</Label>
              <Select 
                value={exportForm.format} 
                onValueChange={(value: 'pdf' | 'csv' | 'excel') => 
                  setExportForm(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={exportForm.dateRange.start}
                onChange={(e) => setExportForm(prev => ({ 
                  ...prev, 
                  dateRange: { ...prev.dateRange, start: e.target.value }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={exportForm.dateRange.end}
                onChange={(e) => setExportForm(prev => ({ 
                  ...prev, 
                  dateRange: { ...prev.dateRange, end: e.target.value }
                }))}
              />
            </div>

            <div className="space-y-3">
              <Label>Incluir no Relatório</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeMembers"
                    checked={exportForm.includeMembers}
                    onCheckedChange={(checked) => 
                      setExportForm(prev => ({ ...prev, includeMembers: checked }))
                    }
                  />
                  <Label htmlFor="includeMembers">Membros da Família</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeBudgets"
                    checked={exportForm.includeBudgets}
                    onCheckedChange={(checked) => 
                      setExportForm(prev => ({ ...prev, includeBudgets: checked }))
                    }
                  />
                  <Label htmlFor="includeBudgets">Orçamentos</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeGoals"
                    checked={exportForm.includeGoals}
                    onCheckedChange={(checked) => 
                      setExportForm(prev => ({ ...prev, includeGoals: checked }))
                    }
                  />
                  <Label htmlFor="includeGoals">Objetivos</Label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleExportReport} 
                disabled={isExporting}
                className="flex-1"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    A exportar...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setExportModalOpen(false)} disabled={isExporting}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Eliminação */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-800">Confirmar Eliminação</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Todos os dados partilhados serão perdidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">O que será eliminado:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Todas as contas bancárias familiares</li>
                <li>• Todos os objetivos financeiros</li>
                <li>• Todos os orçamentos</li>
                <li>• Todas as transações partilhadas</li>
                <li>• Todos os membros e convites</li>
                <li>• Todas as configurações</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="destructive" 
                onClick={handleDeleteFamily}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Família
              </Button>
              <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        onClose={confirmation.close}
        onConfirm={confirmation.onConfirm}
        onCancel={confirmation.onCancel}
        title={confirmation.options.title}
        message={confirmation.options.message}
        confirmText={confirmation.options.confirmText}
        cancelText={confirmation.options.cancelText}
        variant={confirmation.options.variant}
      />
    </div>
  );
};

export default FamilySettings; 