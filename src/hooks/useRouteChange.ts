import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared/lib/logger';
import { useAuth } from '../contexts/AuthContext';

export const useRouteChange = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    // Invalidar e revalidar todos os dados quando a rota muda
    const invalidateAllData = async () => {
      try {
        // Invalidar queries da área principal (/app)
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

        // Invalidar queries da área pessoal (/personal)
        if (user?.id) {
          await queryClient.invalidateQueries({
            queryKey: ['personal', 'accounts', user.id]
          });
          await queryClient.invalidateQueries({
            queryKey: ['personal', 'transactions', user.id]
          });
          await queryClient.invalidateQueries({
            queryKey: ['personal', 'goals', user.id]
          });
          await queryClient.invalidateQueries({
            queryKey: ['personal', 'budgets', user.id]
          });
          await queryClient.invalidateQueries({
            queryKey: ['personal', 'kpis', user.id]
          });
        }

        // Invalidar queries da área familiar (/family)
        if (user?.id) {
          await queryClient.invalidateQueries({
            queryKey: ['family', 'current', user.id]
          });
          await queryClient.invalidateQueries({
            queryKey: ['family', 'accounts']
          });
          await queryClient.invalidateQueries({
            queryKey: ['family', 'transactions']
          });
          await queryClient.invalidateQueries({
            queryKey: ['family', 'goals']
          });
          await queryClient.invalidateQueries({
            queryKey: ['family', 'budgets']
          });
          await queryClient.invalidateQueries({
            queryKey: ['family', 'members']
          });
          await queryClient.invalidateQueries({
            queryKey: ['family', 'invites']
          });
        }
        
        logger.info('🔄 Dados invalidados e revalidados após mudança de rota:', location.pathname);
      } catch (error) {
        logger.warn('⚠️ Erro ao invalidar dados após mudança de rota:', error);
      }
    };

    // Executar invalidação com um delay maior para garantir que a navegação foi concluída
    const timeoutId = setTimeout(invalidateAllData, 500);
    
    return () => clearTimeout(timeoutId);
  }, [location.pathname, queryClient, user?.id]);
};