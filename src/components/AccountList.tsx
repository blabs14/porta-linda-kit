import { useEffect, useState } from 'react';
import { getAccounts } from '../services/accounts';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Button } from './ui/button';

export type Account = {
  id: string;
  nome: string;
  tipo: string;
  saldo_inicial: number;
  created_at: string;
};

interface AccountListProps {
  onEdit: (account: Account) => void;
}

const AccountList = ({ onEdit }: AccountListProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await getAccounts();
    if (!error && data) setAccounts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Saldo Inicial</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((acc) => (
            <TableRow key={acc.id}>
              <TableCell>{acc.nome}</TableCell>
              <TableCell>{acc.tipo}</TableCell>
              <TableCell>{acc.saldo_inicial}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => onEdit(acc)}>
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {accounts.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={4} className="text-center">Nenhuma conta encontrada.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {loading && <div className="text-center mt-2">A carregar...</div>}
    </div>
  );
};

export default AccountList;