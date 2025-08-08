import { formatCurrency } from '../lib/utils';
import { Badge } from './ui/badge';
import { Target } from 'lucide-react';
import { AccountWithBalances } from '../integrations/supabase/types';

interface RegularAccountBalanceProps {
  account: AccountWithBalances;
}

export const RegularAccountBalance = ({ account }: RegularAccountBalanceProps) => {
  return (
    <>
      {/* Saldo Total */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Saldo Total</span>
          <span className="text-lg font-semibold">
            {formatCurrency(account.saldo_atual || 0)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground capitalize">{account.tipo}</p>
      </div>

      {/* Saldo Reservado */}
      {account.total_reservado > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              Reservado
            </span>
            <Badge variant="secondary" className="text-xs text-blue-600 bg-blue-50 border-blue-200">
              {formatCurrency(account.total_reservado)}
            </Badge>
          </div>
        </div>
      )}

      {/* Saldo Disponível */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Disponível</span>
          <span className={`text-sm font-medium ${
            account.saldo_disponivel < 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {formatCurrency(account.saldo_disponivel)}
          </span>
        </div>
      </div>
    </>
  );
};