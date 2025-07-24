import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  CreditCard,
  Smartphone,
  ShoppingCart,
  Car,
  Home,
  Heart
} from 'lucide-react';

const transactions = [
  {
    id: 1,
    description: 'Supermercado Continente',
    amount: -45.20,
    category: 'Alimentação',
    date: '2024-01-20',
    type: 'expense',
    icon: ShoppingCart,
    method: 'Cartão de Débito'
  },
  {
    id: 2,
    description: 'Salário Janeiro',
    amount: 2500.00,
    category: 'Salário',
    date: '2024-01-19',
    type: 'income',
    icon: CreditCard,
    method: 'Transferência'
  },
  {
    id: 3,
    description: 'Farmácia',
    amount: -12.80,
    category: 'Saúde',
    date: '2024-01-18',
    type: 'expense',
    icon: Heart,
    method: 'Multibanco'
  },
  {
    id: 4,
    description: 'Combustível',
    amount: -65.40,
    category: 'Transporte',
    date: '2024-01-17',
    type: 'expense',
    icon: Car,
    method: 'Cartão de Crédito'
  },
  {
    id: 5,
    description: 'Renda Janeiro',
    amount: -800.00,
    category: 'Habitação',
    date: '2024-01-15',
    type: 'expense',
    icon: Home,
    method: 'Transferência'
  },
  {
    id: 6,
    description: 'Freelance Design',
    amount: 350.00,
    category: 'Trabalho Extra',
    date: '2024-01-14',
    type: 'income',
    icon: Smartphone,
    method: 'MB Way'
  }
];

const categories = ['Todas', 'Alimentação', 'Transporte', 'Saúde', 'Habitação', 'Salário', 'Trabalho Extra'];

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || transaction.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transações</h1>
          <p className="text-muted-foreground">Gerir todas as suas movimentações</p>
        </div>
        <Button className="bg-primary hover:bg-primary-dark shadow-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      {/* Layout responsivo: full-width em mobile, duas colunas em md+ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Filtros - coluna lateral em md+ */}
        <div className="md:col-span-1">
          <Card className="bg-gradient-card shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pesquisa */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar transações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-border focus:ring-primary"
                />
              </div>

              {/* Categorias */}
              <div>
                <p className="font-medium text-sm text-foreground mb-3">Categorias</p>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === category
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por data */}
              <div>
                <p className="font-medium text-sm text-foreground mb-3">Período</p>
                <Button variant="outline" size="sm" className="w-full justify-start border-border">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  Selecionar datas
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de transações */}
        <div className="md:col-span-3">
          <Card className="bg-gradient-card shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">
                  {filteredTransactions.length} Transações
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Total:</span>
                  <span className="font-semibold text-foreground">
                    €{filteredTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-accent hover:bg-accent/80 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Ícone da categoria */}
                      <div className={`p-3 rounded-lg ${
                        transaction.type === 'income' 
                          ? 'bg-success/10' 
                          : 'bg-destructive/10'
                      }`}>
                        <transaction.icon className={`h-5 w-5 ${
                          transaction.type === 'income' 
                            ? 'text-success' 
                            : 'text-destructive'
                        }`} />
                      </div>

                      {/* Detalhes da transação */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {transaction.description}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {transaction.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{transaction.date}</span>
                          <span>•</span>
                          <span>{transaction.method}</span>
                        </div>
                      </div>
                    </div>

                    {/* Valor e indicador */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`font-bold text-lg ${
                          transaction.type === 'income' 
                            ? 'text-success' 
                            : 'text-foreground'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}€{Math.abs(transaction.amount).toFixed(2)}
                        </div>
                      </div>
                      
                      {/* Seta indicadora */}
                      <div className={`p-1 rounded ${
                        transaction.type === 'income' 
                          ? 'text-success' 
                          : 'text-destructive'
                      }`}>
                        {transaction.type === 'income' ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-muted-foreground mb-2">
                      Nenhuma transação encontrada
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tente ajustar os filtros ou adicionar uma nova transação
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}