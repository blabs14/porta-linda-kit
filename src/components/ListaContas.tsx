import { useEffect, useState } from 'react';
import { getAccounts } from '../services/accounts';
import { getAccountAllocationsTotal } from '../services/goalAllocations';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';

export type Account = {
  id: string;
  nome: string;
  tipo: string;
  saldo?: number;
  created_at: string;
};

interface AccountListProps {
  onEdit: (account: Account) => void;
}

const AccountList = ({ onEdit }: AccountListProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await getAccounts();
    if (!error && data) {
      setAccounts(data);
      
      // Buscar alocações para cada conta
      const allocationsData: Record<string, number> = {};
      for (const account of data) {
        const { data: total, error } = await getAccountAllocationsTotal(account.id, user?.id || '');
        if (error) {
          console.error(`Erro ao buscar alocações da conta ${account.id}:`, error);
          allocationsData[account.id] = 0;
        } else {
          allocationsData[account.id] = total || 0;
        }
      }
      setAllocations(allocationsData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, [user?.id]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  };

  const getAvailableBalance = (account: Account) => {
    const balance = account.saldo || 0;
    const reserved = allocations[account.id] || 0;
    return balance - reserved;
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Saldo Total</TableHead>
            <TableHead>Reservado para Objetivos</TableHead>
            <TableHead>Saldo Disponível</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((acc) => {
            const reserved = allocations[acc.id] || 0;
            const available = getAvailableBalance(acc);
            
            return (
              <TableRow key={acc.id}>
                <TableCell className="font-medium">{acc.nome}</TableCell>
                <TableCell>
                  <Badge variant="outline">{acc.tipo}</Badge>
                </TableCell>
                <TableCell className="font-mono">
                  {formatCurrency(acc.saldo || 0)}
                </TableCell>
                <TableCell className="font-mono text-orange-600">
                  {reserved > 0 ? formatCurrency(reserved) : '-'}
                </TableCell>
                <TableCell className="font-mono">
                  <span className={available < 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(available)}
                  </span>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => onEdit(acc)}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {accounts.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center">Nenhuma conta encontrada.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {loading && <div className="text-center mt-2">A carregar...</div>}
    </div>
  );
};

export default AccountList;