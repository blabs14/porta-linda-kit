import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

interface BudgetCardProps {
  categoria: string;
  valor: number;
  mes: string;
}

const BudgetCard = ({ categoria, valor, mes }: BudgetCardProps) => (
  <Card className="w-full max-w-xs">
    <CardHeader>
      <CardTitle>{categoria}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">€{valor.toFixed(2)}</div>
      <div className="text-muted-foreground text-sm mt-1">Mês: {mes}</div>
    </CardContent>
  </Card>
);

export default BudgetCard;