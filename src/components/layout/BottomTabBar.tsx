import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  CreditCard, 
  Target, 
  Users, 
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabItems = [
  {
    title: 'Início',
    href: '/',
    icon: Home
  },
  {
    title: 'Transações',
    href: '/transacoes',
    icon: CreditCard
  },
  {
    title: 'Objetivos',
    href: '/objetivos',
    icon: Target
  },
  {
    title: 'Família',
    href: '/familia',
    icon: Users
  },
  {
    title: 'Insights',
    href: '/insights',
    icon: TrendingUp
  }
];

export function BottomTabBar() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg">
      <div className="flex justify-around items-center py-2 px-1">
        {tabItems.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 min-w-0 flex-1 max-w-[80px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-primary-light"
                  : ""
              )}>
                <item.icon className={cn(
                  "h-5 w-5 transition-all duration-200",
                  isActive
                    ? "text-primary scale-110"
                    : "text-muted-foreground"
                )} />
              </div>
              <span className={cn(
                "text-xs font-medium mt-1 truncate transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}>
                {item.title}
              </span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}