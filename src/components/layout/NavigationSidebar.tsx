import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { 
  Home, 
  Users, 
  Settings, 
  ChevronRight,
  User,
  Lightbulb,
  BarChart3,
  Calendar,
  Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfilesQuery';

interface NavigationSidebarProps {
  onNavigate?: () => void;
}

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/app',
    icon: Home,
    description: 'Visão geral das finanças'
  },
  {
    title: 'Relatórios',
    href: '/app/reports',
    icon: BarChart3,
    description: 'Relatórios e análises'
  },
  {
    title: 'Calendário de Fluxos',
    href: '/app/cashflow',
    icon: Calendar,
    description: 'Previsões e fluxos de caixa'
  },
  {
    title: 'Performance',
    href: '/app/performance',
    icon: Activity,
    description: 'Monitorização de performance'
  },
                {
                title: 'Área Pessoal',
                href: '/personal',
                icon: User,
                description: 'Gestão financeira individual'
              },
              {
                title: 'Finanças Partilhadas',
                href: '/family',
                icon: Users,
                description: 'Gestão financeira familiar'
              },

];

export function NavigationSidebar({ onNavigate }: NavigationSidebarProps) {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  // Função para obter as iniciais do nome
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Dados do utilizador
  const userName = profile?.nome || user?.user_metadata?.full_name || 'Utilizador';
  const userEmail = user?.email || 'usuario@exemplo.com';
  const userInitials = getInitials(userName);

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
            onMouseEnter={() => { if (item.href === '/app/reports') { import('../../pages/reports'); } if (item.href === '/personal') { import('../../features/personal/PersonalInsights'); } if (item.href === '/personal/insights') { import('../../features/personal/PersonalInsights'); } }}
            onFocus={() => { if (item.href === '/app/reports') { import('../../pages/reports'); } if (item.href === '/personal') { import('../../features/personal/PersonalInsights'); } if (item.href === '/personal/insights') { import('../../features/personal/PersonalInsights'); } }}
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

      {/* User section */}
      <div className="p-4 border-t border-border">
        <NavLink
          to="/app/profile"
          onClick={onNavigate}
          className="flex items-center space-x-3 p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 bg-gradient-secondary rounded-full flex items-center justify-center">
            <span className="text-secondary-foreground font-medium text-sm">
              {profileLoading ? '...' : userInitials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-foreground">
              {profileLoading ? 'A carregar...' : userName}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {userEmail}
            </div>
          </div>
          <User className="h-4 w-4 text-muted-foreground" />
        </NavLink>
      </div>
    </div>
  );
}