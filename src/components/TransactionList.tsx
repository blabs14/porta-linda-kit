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

const TransactionList = ({ onEdit }: { onEdit?: (tx: any) => void }) => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    account_id: 'all',
    categoria_id: 'all',
    dataInicio: '',
    dataFim: '',
    tipo: 'all', // Novo filtro por tipo
  });
  
  // Usar TanStack Query hooks
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { accounts, categories } = useReferenceData();
  const deleteTransactionMutation = useDeleteTransaction();
  
  const loading = transactionsLoading || accounts.isLoading || categories.isLoading;

  // Criar mapa de contas para exibição
  const accountsMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    accounts.data?.forEach((acc: any) => { map[acc.id] = acc.nome; });
    return map;
  }, [accounts.data]);

  // Criar mapa de categorias para exibição
  const categoriesMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    categories.data?.forEach((cat: any) => { map[cat.id] = cat.nome; });
    return map;
  }, [categories.data]);

  // Filtros handlers
  const handleContaChange = (value: string) => setFilters(f => ({ ...f, account_id: value }));
  const handleCategoriaChange = (value: string) => setFilters(f => ({ ...f, categoria_id: value }));
  const handleDataInicio = (e: React.ChangeEvent<HTMLInputElement>) => setFilters(f => ({ ...f, dataInicio: e.target.value }));
  const handleDataFim = (e: React.ChangeEvent<HTMLInputElement>) => setFilters(f => ({ ...f, dataFim: e.target.value }));
  const handleTipoChange = (value: string) => {
    setFilters(prev => ({ ...prev, tipo: value }));
  };

  // Aplicar filtros localmente
  const filteredTransactions = React.useMemo(() => {
    let filtered = transactions;
    
    if (filters.account_id && filters.account_id !== 'all') {
      filtered = filtered.filter(tx => tx.account_id === filters.account_id);
    }
    if (filters.categoria_id && filters.categoria_id !== 'all') {
      filtered = filtered.filter(tx => tx.categoria_id === filters.categoria_id);
    }
    if (filters.tipo && filters.tipo !== 'all') {
      filtered = filtered.filter(tx => tx.tipo === filters.tipo);
    }
    if (filters.dataInicio) {
      filtered = filtered.filter(tx => tx.data >= filters.dataInicio);
    }
    if (filters.dataFim) {
      filtered = filtered.filter(tx => tx.data <= filters.dataFim);
    }
    
    return filtered;
  }, [transactions, filters]);

  // Remover transação
  const handleRemove = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja remover esta transação?')) return;
    try {
      await deleteTransactionMutation.mutateAsync(id);
    } catch (error) {
      console.error('Erro ao remover transação:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const formatCurrency = (value: number, tipo: string) => {
    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(absValue);
    
    // Adicionar sinal baseado no tipo
    if (tipo === 'despesa') {
      return `-${formatted}`;
    } else {
      return `+${formatted}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filtros Fixos - Sempre visíveis */}
      <div className="flex-shrink-0 bg-background border-b p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Select value={filters.account_id} onValueChange={handleContaChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as contas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.data?.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.categoria_id} onValueChange={handleCategoriaChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.data?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.tipo} onValueChange={handleTipoChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="Data início"
            value={filters.dataInicio}
            onChange={handleDataInicio}
          />

          <Input
            type="date"
            placeholder="Data fim"
            value={filters.dataFim}
            onChange={handleDataFim}
          />
        </div>
      </div>

      {/* Tabela com Scroll apenas nos dados */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Cabeçalhos da Tabela Fixos */}
          <div className="flex-shrink-0 bg-card border-b">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>

          {/* Corpo da Tabela com Scroll */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.data)}</TableCell>
                      <TableCell>{transaction.descricao || '-'}</TableCell>
                      <TableCell>{categoriesMap[transaction.categoria_id] || '-'}</TableCell>
                      <TableCell>{accountsMap[transaction.account_id] || '-'}</TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(Number(transaction.valor), transaction.tipo)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit?.(transaction)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemove(transaction.id)}
                            className="text-red-600 hover:text-red-700"
                            disabled={deleteTransactionMutation.isPending}
                          >
                            {deleteTransactionMutation.isPending ? 'A remover...' : 'Remover'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma transação encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;