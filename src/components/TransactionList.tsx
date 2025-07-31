import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Button } from './ui/button';
import { LoadingSpinner } from './ui/loading-states';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { useTransactions, useDeleteTransaction } from '../hooks/useTransactionsQuery';
import { useReferenceData } from '../hooks/useCache';
import { useConfirmation } from '../hooks/useConfirmation';
import { ConfirmationDialog } from './ui/confirmation-dialog';
import { useToast } from '../hooks/use-toast';
import { Trash2, Edit, Eye, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';

const TransactionList = ({ onEdit }: { onEdit?: (tx: any) => void }) => {
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { accounts, categories } = useReferenceData();
  const deleteTransactionMutation = useDeleteTransaction();
  const confirmation = useConfirmation();
  const { toast } = useToast();
  
  console.log('[TransactionList] Component rendered');
  console.log('[TransactionList] Transactions data:', transactions);
  console.log('[TransactionList] Transactions count:', transactions.length);
  console.log('[TransactionList] Loading state:', transactionsLoading);
  
  // Estado para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Estado para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const loading = transactionsLoading || accounts.isLoading || categories.isLoading;
  const accountsData = Array.isArray(accounts.data) ? accounts.data : [];
  const categoriesData = Array.isArray(categories.data) ? categories.data : [];

  // Filtrar transações
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = !searchTerm || 
        (transaction.descricao && transaction.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesAccount = selectedAccount === 'all' || 
        transaction.account_id === selectedAccount;
      
      const matchesCategory = selectedCategory === 'all' || 
        transaction.categoria_id === selectedCategory;
      
      const matchesType = selectedType === 'all' || 
        transaction.tipo === selectedType;
      
      return matchesSearch && matchesAccount && matchesCategory && matchesType;
    });
  }, [transactions, searchTerm, selectedAccount, selectedCategory, selectedType]);

  // Calcular paginação
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  console.log('[TransactionList] Current page:', currentPage);
  console.log('[TransactionList] Items per page:', itemsPerPage);
  console.log('[TransactionList] Total pages:', totalPages);
  console.log('[TransactionList] Current transactions:', currentTransactions.length);
  console.log('[TransactionList] Filtered transactions:', filteredTransactions.length);
  console.log('[TransactionList] Should show pagination:', totalPages > 1);
  console.log('[TransactionList] Start index:', startIndex);
  console.log('[TransactionList] End index:', endIndex);

  // Resetar página quando filtros mudam
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedAccount, selectedCategory, selectedType]);

  // Resetar página quando o número de transações muda (nova transação criada)
  React.useEffect(() => {
    console.log('[TransactionList] Number of transactions changed from', transactions.length - 1, 'to', transactions.length);
    console.log('[TransactionList] Resetting to page 1');
    setCurrentPage(1);
  }, [transactions.length]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  const handleDelete = (transactionId: string) => {
    confirmation.confirm(
      {
        title: 'Eliminar Transação',
        message: 'Tem a certeza que deseja eliminar esta transação? Esta ação não pode ser desfeita.',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'destructive',
      },
      () => {
        deleteTransactionMutation.mutate(transactionId);
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">A carregar transações...</span>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Nenhuma transação encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Pesquisa */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Pesquisar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Descrição..."
                value={searchTerm}
                onChange={(e) => {
                  try {
                    setSearchTerm(e.target.value);
                  } catch (error) {
                    console.error('Erro ao atualizar searchTerm:', error);
                  }
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtro por Conta */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Conta</label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accountsData.map((account) => (
                  <SelectItem key={account.account_id} value={account.account_id}>
                    {account.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Categoria */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Categoria</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categoriesData.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Tipo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botão Limpar Filtros */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">&nbsp;</label>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSelectedAccount('all');
                setSelectedCategory('all');
                setSelectedType('all');
              }}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTransactions.map((transaction) => {
                const account = accountsData.find(acc => acc.account_id === transaction.account_id);
                const category = categoriesData.find(cat => cat.id === transaction.categoria_id);

                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {formatDate(transaction.data)}
                    </TableCell>
                    <TableCell>{transaction.descricao}</TableCell>
                    <TableCell>
                      {category ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {category.nome}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {account ? (
                        <span className="text-sm text-gray-600">{account.nome}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${
                        (transaction.descricao && transaction.descricao.includes('Transferência')) ? 'text-blue-600' :
                        transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(transaction.descricao && transaction.descricao.includes('Transferência')) ? 
                          (transaction.descricao.includes('←') ? '+' : '-') :
                          (transaction.tipo === 'receita' ? '+' : '-')
                        }{formatCurrency(transaction.valor)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(transaction)}
                            className="text-gray-500 hover:text-gray-700 p-1"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          disabled={deleteTransactionMutation.isPending}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Controles de Paginação */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
        <div className="text-sm text-gray-700">
          Mostrando {startIndex + 1} a {Math.min(endIndex, filteredTransactions.length)} de {filteredTransactions.length} transações
          {currentPage > 1 && (
            <span className="ml-2 text-blue-600">
              (Nova transação criada - <button 
                onClick={() => setCurrentPage(1)} 
                className="underline hover:no-underline"
              >
                ir para primeira página
              </button>)
            </span>
          )}
          {filteredTransactions.length > 20 && currentPage === 1 && (
            <span className="ml-2 text-green-600">
              (Há {filteredTransactions.length - 20} transações mais recentes)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <div className="text-sm text-gray-700">
            Página {currentPage} de {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

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

export default TransactionList;