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
  MoreHorizontal
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  showInMore?: boolean;
}

const tabItems: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, href: '/family/dashboard' },
  { id: 'goals', label: 'Objetivos', icon: Target, href: '/family/goals' },
  { id: 'budgets', label: 'Orçamentos', icon: CreditCard, href: '/family/budgets' },
  { id: 'accounts', label: 'Contas', icon: CreditCard, href: '/family/accounts' },
  { id: 'transactions', label: 'Transações', icon: TrendingUp, href: '/family/transactions', showInMore: true },
  { id: 'members', label: 'Membros', icon: Users, href: '/family/members', showInMore: true },
  { id: 'settings', label: 'Configurações', icon: Settings, href: '/family/settings', showInMore: true },
];

const FamilyTabBar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const mainTabs = tabItems.filter(item => !item.showInMore);
  const moreTabs = tabItems.filter(item => item.showInMore);

  const isActive = (href: string) => {
    if (href === '/family/dashboard') {
      return currentPath === '/family' || currentPath === '/family/dashboard';
    }
    return currentPath === href;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50">
      <div className="flex items-center justify-around p-2">
        {mainTabs.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full py-2 px-1 rounded-lg transition-colors",
              isActive(item.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
        
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center justify-center w-full py-2 px-1 rounded-lg transition-colors",
                moreTabs.some(item => isActive(item.href))
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Mais</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[50vh]">
            <SheetHeader>
              <SheetTitle>Mais Opções</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {moreTabs.map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-lg border transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <item.icon className="h-6 w-6 mb-2" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default FamilyTabBar; 