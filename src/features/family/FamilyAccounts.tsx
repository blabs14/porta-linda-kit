import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useFamily } from './FamilyProvider';
import { formatCurrency } from '../../lib/utils';
import { Wallet, CreditCard } from 'lucide-react';

const FamilyAccounts: React.FC = () => {
  const { familyAccounts, familyCards, isLoading } = useFamily();

  if (isLoading.accounts) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const regularAccounts = familyAccounts.filter(account => account.tipo !== 'cartão de crédito');

  return (
    <div className="p-6 space-y-6">
      {/* Contas Bancárias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Contas Bancárias
          </CardTitle>
          <CardDescription>
            Contas correntes e poupanças partilhadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {regularAccounts.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma conta bancária encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regularAccounts.map((account) => (
                <Card key={account.account_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{account.nome}</h3>
                      <span className="text-sm text-muted-foreground">{account.tipo}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Saldo Atual:</span>
                        <span className="font-medium">{formatCurrency(account.saldo_atual || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Reservado:</span>
                        <span className="font-medium">{formatCurrency(account.total_reservado || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Disponível:</span>
                        <span className="font-medium">{formatCurrency(account.saldo_disponivel || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cartões de Crédito */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Cartões de Crédito
          </CardTitle>
          <CardDescription>
            Cartões de crédito partilhados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {familyCards.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum cartão de crédito encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {familyCards.map((card) => {
                const isInDebt = (card.saldo_atual || 0) < 0;
                return (
                  <Card key={card.account_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{card.nome}</h3>
                        <span className={`text-sm px-2 py-1 rounded ${
                          isInDebt 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {isInDebt ? 'Em Dívida' : 'Em Dia'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Saldo:</span>
                          <span className={`font-medium ${isInDebt ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(card.saldo_atual || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Limite:</span>
                          <span className="font-medium">{formatCurrency(card.saldo_disponivel || 0)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FamilyAccounts; 