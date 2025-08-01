import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  Plus, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar,
  Search,
  Filter,
  X
} from 'lucide-react';
import { useFamily } from './FamilyProvider';
import { useAccounts } from '../../hooks/useAccountsQuery';
import { useCategories } from '../../hooks/useCategoriesQuery';
import { useAuth } from '../../contexts/AuthContext';
import { exportReport } from '../../services/exportService';
import { formatCurrency } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { useConfirmation } from '../../hooks/useConfirmation';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import TransactionForm from '../../components/TransactionForm';

const FamilyTransactions: React.FC = () => {
  const { 
    familyTransactions, 
    createFamilyTransaction, 
    updateFamilyTransaction, 
    deleteFamilyTransaction,
    isLoading,
    canEdit,
    canDelete
  } = useFamily();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<any | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Estado para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { user } = useAuth();
  const { toast } = useToast();
  const confirmation = useConfirmation();

  // Forçar atualização quando o modal fecha
  useEffect(() => {
    if (!modalOpen) {
      setRefreshKey(prev => prev + 1);
    }
  }, [modalOpen]);

  const handleNew = () => {
    setEditTx(null);
    setModalOpen(true);
  };

  const handleEdit = (tx: any) => {
    setEditTx(tx);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditTx(null);
  };

  const handleExport = async () => {
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Utilizador não autenticado',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      // Determinar o intervalo de datas baseado nos filtros ou usar o último ano
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { blob, filename } = await exportReport(user.id, {
        format: 'excel',
        dateRange: { start: startDate, end: endDate },
      });

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
        title: 'Exportação concluída',
        description: `Relatório familiar exportado como ${filename}`,
      });
    } catch (error: any) {
      console.error('Erro na exportação:', error);
      toast({
        title: 'Erro na exportação',
        description: error.message || 'Ocorreu um erro ao exportar o relatório',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Filtrar transações
  const filteredTransactions = React.useMemo(() => {
    return familyTransactions.filter(transaction => {
      const matchesSearch = !searchTerm || 
        (transaction.descricao && transaction.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesAccount = selectedAccount === 'all' || 
        transaction.account_id === selectedAccount;
      
      const matchesCategory = selectedCategory === 'all' || 
        transaction.categoria_id === selectedCategory;
      
      const matchesType = selectedType === 'all' || 
        transaction.tipo === selectedType;
      
      // Filtro por data
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const transactionDate = new Date(transaction.data);
        const today = new Date();
        
        if (dateRange.start && dateRange.end) {
          // Filtro por intervalo de datas personalizado
          const startDate = new Date(dateRange.start);
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          matchesDate = transactionDate >= startDate && transactionDate <= endDate;
        } else {
          // Filtros predefinidos
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
          startOfWeek.setHours(0, 0, 0, 0);
          
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado
          endOfWeek.setHours(23, 59, 59, 999);
          
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
          
          switch (dateFilter) {
            case 'week':
              matchesDate = transactionDate >= startOfWeek && transactionDate <= endOfWeek;
              break;
            case 'month':
              matchesDate = transactionDate >= startOfMonth && transactionDate <= endOfMonth;
              break;
            case 'year':
              matchesDate = transactionDate >= startOfYear && transactionDate <= endOfYear;
              break;
          }
        }
      }
      
      return matchesSearch && matchesAccount && matchesCategory && matchesType && matchesDate;
    });
  }, [familyTransactions, searchTerm, selectedAccount, selectedCategory, selectedType, dateFilter, dateRange]);

  // Calcular métricas filtradas
  const filteredMetrics = React.useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + t.valor, 0);

    const totalExpenses = filteredTransactions
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + t.valor, 0);

    const netBalance = totalIncome - totalExpenses;
    const transactionCount = filteredTransactions.length;

    return {
      totalIncome,
      totalExpenses,
      netBalance,
      transactionCount
    };
  }, [filteredTransactions]);

  // Calcular métricas totais (sem filtros)
  const totalIncome = familyTransactions
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + t.valor, 0);

  const totalExpenses = familyTransactions
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + t.valor, 0);

  const netBalance = totalIncome - totalExpenses;
  const transactionCount = familyTransactions.length;

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAccount('all');
    setSelectedCategory('all');
    setSelectedType('all');
    setDateFilter('all');
    setDateRange({ start: '', end: '' });
  };

  const hasActiveFilters = searchTerm || selectedAccount !== 'all' || selectedCategory !== 'all' || 
    selectedType !== 'all' || dateFilter !== 'all' || dateRange.start || dateRange.end;

  const getCategoryName = (categoriaId: string) => {
    const category = categories.find(cat => cat.id === categoriaId);
    return category?.nome || 'Categoria desconhecida';
  };

  const getAccountName = (accountId: string) => {
    const account = (accounts as any[]).find(acc => acc.account_id === accountId);
    return account?.nome || 'Conta desconhecida';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  const handleDelete = async (transactionId: string) => {
    const transaction = familyTransactions.find(t => t.id === transactionId);
    
    confirmation.confirm(
      {
        title: 'Eliminar Transação Familiar',
        message: `Tem a certeza que deseja eliminar a transação "${transaction?.descricao}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'destructive',
      },
      async () => {
        try {
          await deleteFamilyTransaction(transactionId);
          toast({
            title: 'Transação eliminada',
            description: 'A transação familiar foi eliminada com sucesso.',
          });
        } catch (error: any) {
          toast({
            title: 'Erro ao eliminar transação',
            description: error.message || 'Ocorreu um erro ao eliminar a transação.',
            variant: 'destructive',
          });
        }
      }
    );
  };

  if (isLoading.transactions) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">A carregar transações familiares...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transações Familiares</h1>
          <p className="text-muted-foreground">
            Gerencie as transações partilhadas da família
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'A exportar...' : 'Exportar'}
          </Button>
          {canEdit('transaction') && (
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Transação
            </Button>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Receitas</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(filteredMetrics.totalIncome)}</p>
                {filteredMetrics.totalIncome !== totalIncome && (
                  <p className="text-xs text-muted-foreground">Filtrado de {formatCurrency(totalIncome)}</p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Despesas</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(filteredMetrics.totalExpenses)}</p>
                {filteredMetrics.totalExpenses !== totalExpenses && (
                  <p className="text-xs text-muted-foreground">Filtrado de {formatCurrency(totalExpenses)}</p>
                )}
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Líquido</p>
                <p className={`text-2xl font-bold ${filteredMetrics.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(filteredMetrics.netBalance)}
                </p>
                {filteredMetrics.netBalance !== netBalance && (
                  <p className="text-xs text-muted-foreground">Filtrado de {formatCurrency(netBalance)}</p>
                )}
              </div>
              <Wallet className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transações</p>
                <p className="text-2xl font-bold">{filteredMetrics.transactionCount}</p>
                {filteredMetrics.transactionCount !== transactionCount && (
                  <p className="text-xs text-muted-foreground">Filtrado de {transactionCount}</p>
                )}
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pesquisa */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Pesquisar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Conta */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Conta</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as contas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                                     {(accounts as any[]).map((account) => (
                     <SelectItem key={account.account_id} value={account.account_id}>
                       {account.nome}
                     </SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtros de data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="year">Este ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data inicial</label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data final</label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>

          {/* Botão limpar filtros */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <CardTitle>Transações ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhuma transação encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? 'Tente ajustar os filtros para ver mais resultados'
                  : 'Comece a adicionar transações familiares'
                }
              </p>
              {!hasActiveFilters && canEdit('transaction') && (
                <Button onClick={handleNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Transação
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{transaction.descricao}</h3>
                          <Badge variant={transaction.tipo === 'receita' ? 'default' : 'secondary'}>
                            {transaction.tipo === 'receita' ? 'Receita' : 'Despesa'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Conta: {getAccountName(transaction.account_id)}</p>
                          <p>Categoria: {getCategoryName(transaction.categoria_id)}</p>
                          <p>Data: {formatDate(transaction.data)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.tipo === 'receita' ? '+' : '-'}{formatCurrency(transaction.valor)}
                        </p>
                        {canEdit('transaction') && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(transaction)}
                            >
                              Editar
                            </Button>
                            {canDelete('transaction') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(transaction.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Eliminar
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Transação */}
      <Dialog 
        open={modalOpen} 
        onOpenChange={(open) => {
          setModalOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editTx ? 'Editar Transação Familiar' : 'Nova Transação Familiar'}</DialogTitle>
            <DialogDescription>
              {editTx ? 'Editar dados da transação familiar' : 'Criar nova transação familiar'}
            </DialogDescription>
          </DialogHeader>
          <TransactionForm 
            initialData={editTx || undefined} 
            onSuccess={() => {
              handleClose();
            }} 
            onCancel={handleClose} 
          />
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

export default FamilyTransactions; 