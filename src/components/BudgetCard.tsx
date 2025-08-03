import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { getCategoryIcon } from '../lib/utils';
import * as LucideIcons from 'lucide-react';

interface BudgetCardProps {
  categoria: string;
  valor: number;
  mes: string;
}

const BudgetCard = ({ categoria, valor, mes }: BudgetCardProps) => {
  const iconName = getCategoryIcon(categoria);
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Target;

  return (
    <Card className="w-full max-w-xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconComponent className="h-4 w-4 text-muted-foreground" />
          {categoria}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">€{valor.toFixed(2)}</div>
        <div className="text-muted-foreground text-sm mt-1">Mês: {mes}</div>
      </CardContent>
    </Card>
  );
};

export default BudgetCard;