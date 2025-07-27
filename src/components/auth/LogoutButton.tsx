import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '../../lib/supabaseClient';
import { cn } from '@/lib/utils';

export default function LogoutButton() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
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