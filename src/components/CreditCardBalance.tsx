// import { useCreditCardSummary } from '../hooks/useAccountsQuery';
import { formatCurrency } from '../lib/utils';

interface CreditCardBalanceProps {
  accountId: string;
  fallbackBalance: number;
  accountType: string;
}

export const CreditCardBalance = ({ accountId, fallbackBalance, accountType }: CreditCardBalanceProps) => {
  // TODO: Descomentar quando a função RPC get_credit_card_summary for implementada
  // const { data: summary } = useCreditCardSummary(accountId);
  
  // Para cartões de crédito, o saldo total deve ser sempre <= 0
  // Usar o saldo calculado pela função RPC que já aplica a lógica correta
  // const balance = summary ? summary.current_balance : Math.min(0, fallbackBalance);
  const balance = Math.min(0, fallbackBalance);
  
  // Determinar a cor baseada no saldo (sempre vermelho para cartões de crédito, exceto quando = 0)
  const balanceColor = balance < 0 ? 'text-red-600' : 'text-gray-600';
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Saldo Atual</span>
        <span className={`text-lg font-semibold ${balanceColor}`}>
          {formatCurrency(balance)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground capitalize">{accountType}</p>
    </div>
  );
};