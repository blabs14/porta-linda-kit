// import { useCreditCardSummary } from '../hooks/useAccountsQuery';
import { formatCurrency } from '../lib/utils';
import { Badge } from './ui/badge';
import { CreditCard, AlertTriangle } from 'lucide-react';

interface CreditCardInfoProps {
  accountId: string;
}

export const CreditCardInfo = ({ accountId }: CreditCardInfoProps) => {
  // TODO: Descomentar quando a função RPC get_credit_card_summary for implementada
  // const { data: summary, isLoading } = useCreditCardSummary(accountId);
  
  // Implementação temporária até a função RPC estar disponível
  const isLoading = false;
  const summary = null;
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
      </div>
    );
  }
  
  if (!summary) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4" />
        <span>Informações não disponíveis</span>
      </div>
    );
  }
  
  const utilizationPercentage = summary.credit_limit > 0 
    ? Math.abs((summary.current_balance / summary.credit_limit) * 100)
    : 0;
  
  const availableCredit = summary.credit_limit + summary.current_balance; // current_balance é negativo
  
  return (
    <div className="space-y-3">
      {/* Limite de Crédito */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <CreditCard className="h-3 w-3" />
          Limite
        </span>
        <span className="text-sm font-medium">
          {formatCurrency(summary.credit_limit)}
        </span>
      </div>
      
      {/* Crédito Disponível */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Disponível</span>
        <span className={`text-sm font-medium ${
          availableCredit > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {formatCurrency(availableCredit)}
        </span>
      </div>
      
      {/* Taxa de Utilização */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Utilização</span>
          <Badge 
            variant={utilizationPercentage > 80 ? "destructive" : utilizationPercentage > 50 ? "secondary" : "outline"}
            className="text-xs"
          >
            {utilizationPercentage.toFixed(1)}%
          </Badge>
        </div>
        
        {/* Barra de progresso */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              utilizationPercentage > 80 
                ? 'bg-red-500' 
                : utilizationPercentage > 50 
                ? 'bg-yellow-500' 
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};