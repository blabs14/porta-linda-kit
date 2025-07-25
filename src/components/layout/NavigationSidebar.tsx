import { NavLink } from 'react-router-dom';
import { 
  Home, 
  CreditCard, 
  Target, 
  Users, 
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationSidebarProps {
  onNavigate?: () => void;
}

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: Home,
    description: 'Visão geral das suas finanças'
  },
  {
    title: 'Contas',
    href: '/accounts',
    icon: CreditCard,
    description: 'Gestão de contas bancárias'
  },
  {
    title: 'Transações',
    href: '/transactions',
    icon: CreditCard,
    description: 'Histórico e gestão de movimentos'
  },
  {
    title: 'Objetivos',
    href: '/objetivos',
    icon: Target,
    description: 'Metas financeiras e poupanças'
  },
  {
    title: 'Família',
    href: '/familia',
    icon: Users,
    description: 'Membros e partilha de contas'
  },
  {
    title: 'Insights',
    href: '/insights',
    icon: TrendingUp,
    description: 'Análises e relatórios'
  }
];

export function NavigationSidebar({ onNavigate }: NavigationSidebarProps) {
  return (
    <div className="flex flex-col w-full h-full bg-card">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">F</span>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">FinanceApp</h2>
            <p className="text-xs text-muted-foreground">Gestão Familiar</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "h-5 w-5 transition-transform group-hover:scale-110",
                  isActive ? "text-primary-foreground" : ""
                )} />
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium text-sm",
                    isActive ? "text-primary-foreground" : ""
                  )}>
                    {item.title}
                  </div>
                  <div className={cn(
                    "text-xs truncate",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {item.description}
                  </div>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 transition-transform group-hover:translate-x-1",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )} />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section placeholder */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-accent">
          <div className="w-8 h-8 bg-gradient-secondary rounded-full flex items-center justify-center">
            <span className="text-secondary-foreground font-medium text-sm">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-foreground">Utilizador</div>
            <div className="text-xs text-muted-foreground truncate">
              usuario@exemplo.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}