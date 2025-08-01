import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFamily } from './FamilyProvider';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Home, Plus } from 'lucide-react';
import { FamilyNotifications } from '../../components/family/FamilyNotifications';

interface FamilyHeaderProps {
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  primaryActionIcon?: React.ComponentType<{ className?: string }>;
}

const FamilyHeader: React.FC<FamilyHeaderProps> = ({
  onPrimaryAction,
  primaryActionLabel,
  primaryActionIcon: PrimaryActionIcon = Plus
}) => {
  const location = useLocation();
  const { family, myRole } = useFamily();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/family' || path === '/family/dashboard') return 'Dashboard';
    if (path === '/family/goals') return 'Objetivos';
    if (path === '/family/budgets') return 'Orçamentos';
    if (path === '/family/accounts') return 'Contas';
    if (path === '/family/transactions') return 'Transações';
    if (path === '/family/members') return 'Membros';
    if (path === '/family/settings') return 'Configurações';
    return 'Família';
  };

  const canPerformActions = myRole === 'owner' || myRole === 'admin' || myRole === 'member';

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-4">
        {/* Botão Voltar à Home */}
        <Link to="/app">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Voltar à Home"
          >
            <Home className="h-4 w-4" />
          </Button>
        </Link>

        {/* Título da Página */}
        <div>
          <h1 className="text-lg font-semibold">
            Família › {getPageTitle()}
          </h1>
          {family && (
            <p className="text-sm text-muted-foreground">
              {family.nome}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notificações da Família */}
        {family?.id && (
          <FamilyNotifications familyId={family.id} />
        )}

        {/* Seletor de Família */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Família:</span>
          <Select value={family?.id} onValueChange={() => {}}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecionar família" />
            </SelectTrigger>
            <SelectContent>
              {family && (
                <SelectItem value={family.id}>
                  {family.nome}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Ação Primária */}
        {onPrimaryAction && canPerformActions && (
          <Button onClick={onPrimaryAction} size="sm">
            <PrimaryActionIcon className="h-4 w-4 mr-2" />
            {primaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default FamilyHeader; 