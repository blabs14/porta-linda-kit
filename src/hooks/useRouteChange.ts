import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export const useRouteChange = () => {
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidar e revalidar todos os dados quando a rota muda
    const invalidateAllData = async () => {
      try {
        // Invalidar todas as queries relacionadas com dados da aplicação
        await queryClient.invalidateQueries({
          queryKey: ['accounts']
        });
        await queryClient.invalidateQueries({
          queryKey: ['transactions']
        });
        await queryClient.invalidateQueries({
          queryKey: ['goals']
        });
        await queryClient.invalidateQueries({
          queryKey: ['budgets']
        });
        await queryClient.invalidateQueries({
          queryKey: ['categories']
        });
        await queryClient.invalidateQueries({
          queryKey: ['dashboard']
        });
        
        console.log('🔄 Dados invalidados e revalidados após mudança de rota:', location.pathname);
      } catch (error) {
        console.warn('⚠️ Erro ao invalidar dados após mudança de rota:', error);
      }
    };

    // Executar invalidação com um delay maior para garantir que a navegação foi concluída
    const timeoutId = setTimeout(invalidateAllData, 500);
    
    return () => clearTimeout(timeoutId);
  }, [location.pathname, queryClient]);
}; 