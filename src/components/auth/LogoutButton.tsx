import { LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Erro durante logout:', error);
      // Em caso de erro, ainda assim redireciona para login
      navigate('/login', { replace: true });
    }
  };

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      size="sm"
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
        "text-muted-foreground hover:text-primary hover:bg-primary-light"
      )}
    >
      <LogOut className="h-4 w-4" />
      <span className="text-sm font-medium hidden sm:inline">Terminar Sessão</span>
    </Button>
  );
}