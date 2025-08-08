import React, { useState, Suspense } from 'react';
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
  Database,
  Loader2
} from 'lucide-react';
import { useFamily } from './FamilyProvider';
import { useToast } from '../../hooks/use-toast';
import { useConfirmation } from '../../hooks/useConfirmation';

// Lazy imports para componentes pesados
import { 
  LazyConfirmationDialog, 
  LazyFallback,
  useLazyService 
} from './lazy/index';
import { useLazyService } from './lazy/utils';

const FamilySettings: React.FC = () => {
  const { 
    family,
    updateFamily,
    isLoading,
    canEdit,
    canDelete,
    myRole,
    refetchAll
  } = useFamily();
  
  // Funções para futuras implementações
  const deleteFamily = (useFamily() as any).deleteFamily;
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
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
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const { toast } = useToast();
  const confirmation = useConfirmation();

  // Lazy loading dos serviços
  const { service: exportService, loading: exportServiceLoading } = useLazyService(() => 
    import('../../services/exportService').then(module => ({ default: module.exportReport }))
  );

  // Backup functionality will be implemented later
  const backupService = null;
  const backupServiceLoading = false;

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
    if (!family?.id || !backupService) return;
    
    setIsLoadingBackups(true);
    try {
      const familyBackups = await backupService.getFamilyBackups(family.id);
      setBackups(familyBackups || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar backups',
        description: error.message || 'Não foi possível carregar os backups.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!family?.id || !backupService) return;
    
    setIsCreatingBackup(true);
    try {
      await backupService.createFamilyBackup(family.id);
      toast({
        title: 'Backup criado',
        description: 'O backup da família foi criado com sucesso.',
      });
      loadBackups();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar backup',
        description: error.message || 'Não foi possível criar o backup.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async (backup: any) => {
    if (!backupService) return;
    
    try {
      const result = await backupService.downloadFamilyBackup(backup.id);
      
      // Criar link de download
      const url = window.URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Backup descarregado',
        description: 'O backup foi descarregado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao descarregar backup',
        description: error.message || 'Não foi possível descarregar o backup.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!backupService) return;
    
    try {
      await backupService.deleteFamilyBackup(backupId);
      toast({
        title: 'Backup eliminado',
        description: 'O backup foi eliminado com sucesso.',
      });
      loadBackups();
    } catch (error: any) {
      toast({
        title: 'Erro ao eliminar backup',
        description: error.message || 'Não foi possível eliminar o backup.',
        variant: 'destructive',
      });
    }
  };

  const handleEditSubmit = async () => {
    if (!family?.id) return;
    
    setIsSubmitting(true);
    try {
      await updateFamily(editForm);
      toast({
        title: 'Informações atualizadas',
        description: 'As informações da família foram atualizadas com sucesso.',
      });
      setEditModalOpen(false);
      refetchAll();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar as informações.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportReport = async () => {
    if (!family?.id || !exportService) return;
    
    setIsExporting(true);
    try {
      const result = await exportService(family.id, {
        type: 'family-report',
        format: exportForm.format,
        dateRange: exportForm.dateRange,
        includeMembers: exportForm.includeMembers,
        includeBudgets: exportForm.includeBudgets,
        includeGoals: exportForm.includeGoals,
      });

      // Criar link de download
      const url = window.URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Relatório exportado',
        description: 'O relatório foi exportado com sucesso.',
      });
      setExportModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro na exportação',
        description: error.message || 'Não foi possível exportar o relatório.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteFamily = async () => {
    if (!family?.id) return;
    
    try {
      await deleteFamily(family.id);
      toast({
        title: 'Família eliminada',
        description: 'A família foi eliminada com sucesso.',
      });
      setShowDeleteConfirmation(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao eliminar',
        description: error.message || 'Não foi possível eliminar a família.',
        variant: 'destructive',
      });
    }
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

  if (!family) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Família Não Encontrada
            </CardTitle>
            <CardDescription>
              Não foi possível carregar as informações da família.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Verifique se tem permissões para aceder às configurações desta família.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações da Família
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as configurações e preferências da família
          </p>
        </div>
      </div>

      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Informações Básicas
          </CardTitle>
          <CardDescription>
            Dados fundamentais da família
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="family-name">Nome da Família</Label>
              <Input
                id="family-name"
                value={family.nome || ''}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="family-description">Descrição</Label>
              <Input
                id="family-description"
                value={family.description || ''}
                disabled
                className="mt-1"
              />
            </div>
          </div>
          {(canEdit as any)('family') && (
            <Button onClick={() => setEditModalOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Informações
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Exportar Relatórios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exportar Relatórios
          </CardTitle>
          <CardDescription>
            Exporte dados da família em diferentes formatos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gere relatórios completos com todos os dados da família, incluindo transações, contas, objetivos e orçamentos.
          </p>
          <Button 
            onClick={() => setExportModalOpen(true)}
            disabled={exportServiceLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatórios
          </Button>
        </CardContent>
      </Card>

      {/* Backup de Dados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup de Dados
          </CardTitle>
          <CardDescription>
            Crie e gerencie backups dos dados da família
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Crie backups completos dos dados da família para segurança e recuperação.
              </p>
            </div>
            <Button 
              onClick={handleCreateBackup}
              disabled={isCreatingBackup || backupServiceLoading}
            >
              {isCreatingBackup ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A criar...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Criar Novo Backup
                </>
              )}
            </Button>
          </div>

          {/* Lista de Backups */}
          {isLoadingBackups ? (
            <div className="flex items-center justify-center py-8">
              <LazyFallback message="A carregar backups..." />
            </div>
          ) : backups.length > 0 ? (
            <div className="space-y-2">
              <h4 className="font-medium">Backups Disponíveis</h4>
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{backup.description || 'Backup automático'}</p>
                      <p className="text-sm text-muted-foreground">
                        {backupService?.formatBackupDate(backup.created_at)} • {backupService?.formatFileSize(backup.size)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadBackup(backup)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBackup(backup.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum backup encontrado. Crie o primeiro backup para proteger os dados da família.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Zona de Perigo */}
      {((canDelete as any)('family') || myRole === 'owner') && (
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
          <CardContent className="space-y-4">
            <div className="p-4 border border-red-200 rounded-lg bg-white">
              <h4 className="font-medium text-red-800 mb-2">Eliminar Família</h4>
              <p className="text-sm text-red-700 mb-4">
                Esta ação eliminará permanentemente toda a família e todos os dados associados, incluindo transações, contas, objetivos e orçamentos. Esta ação não pode ser desfeita.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirmation(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Família
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Informações da Família</DialogTitle>
            <DialogDescription>
              Atualize os dados básicos da família
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome da Família</Label>
              <Input
                id="edit-name"
                value={editForm.nome}
                onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A guardar...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Exportação */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Relatório Familiar</DialogTitle>
            <DialogDescription>
              Configure as opções de exportação do relatório
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="export-format">Formato</Label>
              <select
                id="export-format"
                value={exportForm.format}
                onChange={(e) => setExportForm(prev => ({ ...prev, format: e.target.value as any }))}
                className="w-full p-2 border rounded-md mt-1"
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="export-start">Data Início</Label>
                <Input
                  id="export-start"
                  type="date"
                  value={exportForm.dateRange.start}
                  onChange={(e) => setExportForm(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, start: e.target.value } 
                  }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="export-end">Data Fim</Label>
                <Input
                  id="export-end"
                  type="date"
                  value={exportForm.dateRange.end}
                  onChange={(e) => setExportForm(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, end: e.target.value } 
                  }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Incluir no Relatório</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-members"
                    checked={exportForm.includeMembers}
                    onCheckedChange={(checked) => setExportForm(prev => ({ ...prev, includeMembers: checked }))}
                  />
                  <Label htmlFor="include-members">Membros da Família</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-budgets"
                    checked={exportForm.includeBudgets}
                    onCheckedChange={(checked) => setExportForm(prev => ({ ...prev, includeBudgets: checked }))}
                  />
                  <Label htmlFor="include-budgets">Orçamentos</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-goals"
                    checked={exportForm.includeGoals}
                    onCheckedChange={(checked) => setExportForm(prev => ({ ...prev, includeGoals: checked }))}
                  />
                  <Label htmlFor="include-goals">Objetivos</Label>
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A exportar...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setExportModalOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Eliminação */}
      {showDeleteConfirmation && (
        <Suspense fallback={<LazyFallback message="A carregar diálogo..." />}>
          <LazyConfirmationDialog
            open={showDeleteConfirmation}
            onOpenChange={setShowDeleteConfirmation}
            title="Eliminar Família"
            description="Tem a certeza que deseja eliminar esta família? Esta ação não pode ser desfeita e todos os dados serão perdidos permanentemente."
            onConfirm={handleDeleteFamily}
          />
        </Suspense>
      )}
    </div>
  );
};

export default FamilySettings; 