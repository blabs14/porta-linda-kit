import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { 
  BarChart3, 
  Target, 
  CreditCard, 
  TrendingUp, 
  Users, 
  Settings,
  AlertCircle
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
  hasAlert?: boolean;
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, href: '/family/dashboard' },
  { id: 'goals', label: 'Objetivos', icon: Target, href: '/family/goals' },
  { id: 'budgets', label: 'Orçamentos', icon: CreditCard, href: '/family/budgets', hasAlert: true },
  { id: 'accounts', label: 'Contas', icon: CreditCard, href: '/family/accounts' },
  { id: 'transactions', label: 'Transações', icon: TrendingUp, href: '/family/transactions' },
  { id: 'members', label: 'Membros', icon: Users, href: '/family/members' },
  { id: 'settings', label: 'Configurações', icon: Settings, href: '/family/settings' },
];

const FamilySidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (href: string) => {
    if (href === '/family/dashboard') {
      return currentPath === '/family' || currentPath === '/family/dashboard';
    }
    return currentPath === href;
  };

  return (
    <div className="hidden md:flex w-56 flex-col border-r bg-background">
      <div className="p-6">
        <h2 className="text-lg font-semibold">Finanças Partilhadas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gestão financeira familiar
        </p>
      </div>
      
      <nav className="flex-1 px-3 pb-4">
        <ul className="space-y-1">
          {sidebarItems.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
                
                {item.hasAlert && (
                  <AlertCircle className="h-4 w-4 text-yellow-500 ml-auto" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground">
          <p>Gestão familiar</p>
          <p>Colaboração em tempo real</p>
        </div>
      </div>
    </div>
  );
};

export default FamilySidebar; 