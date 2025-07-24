import { useTransactions } from '../hooks/useTransactions';
import { useEffect, useState } from 'react';
import { getAccounts } from '../services/accounts';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Button } from './ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';

const categorias = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Saúde',
  'Educação',
  'Outros',
];

const TransactionList = ({ onEdit }: { onEdit?: (tx: any) => void }) => {
  const { transactions, remove, filters, setFilters } = useTransactions();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountsMap, setAccountsMap] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    getAccounts().then(({ data }) => {
      if (data) {
        setAccounts(data);
        const map: Record<string, string> = {};
        data.forEach((acc: any) => { map[acc.id] = acc.nome; });
        setAccountsMap(map);
      }
    });
  }, []);

  // Filtros handlers
  const handleContaChange = (value: string) => setFilters(f => ({ ...f, conta_id: value }));
  const handleCategoriaChange = (value: string) => setFilters(f => ({ ...f, categoria: value }));
  const handleDataInicio = (e: React.ChangeEvent<HTMLInputElement>) => setFilters(f => ({ ...f, dataInicio: e.target.value }));
  const handleDataFim = (e: React.ChangeEvent<HTMLInputElement>) => setFilters(f => ({ ...f, dataFim: e.target.value }));

  // Remover transação
  const handleRemove = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja remover esta transação?')) return;
    setRemoving(id);
    await remove(id);
    setRemoving(null);
  };

  return (
    <div className="overflow-x-auto">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <Select value={filters.conta_id} onValueChange={handleContaChange}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Conta" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>{acc.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.categoria} onValueChange={handleCategoriaChange}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {categorias.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={filters.dataInicio} onChange={handleDataInicio} className="w-36" placeholder="Data início" />
        <Input type="date" value={filters.dataFim} onChange={handleDataFim} className="w-36" placeholder="Data fim" />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Conta</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>{accountsMap[tx.conta_id] || tx.conta_id}</TableCell>
              <TableCell>{tx.valor}</TableCell>
              <TableCell>{tx.categoria}</TableCell>
              <TableCell>{tx.data}</TableCell>
              <TableCell>{tx.descricao || '-'}</TableCell>
              <TableCell>
                {onEdit && <Button size="sm" variant="outline" onClick={() => onEdit(tx)}>Editar</Button>}
                <Button size="sm" variant="destructive" className="ml-2" onClick={() => handleRemove(tx.id)} disabled={removing === tx.id}>{removing === tx.id ? 'A remover...' : 'Remover'}</Button>
              </TableCell>
            </TableRow>
          ))}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center">Nenhuma transação encontrada.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionList;