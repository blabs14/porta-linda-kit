import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { payrollService } from '../services/payrollService';

interface OnboardingStatus {
  needsOnboarding: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePayrollOnboarding(): OnboardingStatus {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Verificar se o utilizador tem um contrato ativo
        const activeContract = await payrollService.getActiveContract(user.id);
        
        // Se não tem contratos ativos, precisa de onboarding
        const hasActiveContract = activeContract !== null;
        setNeedsOnboarding(!hasActiveContract);

        // Redirecionar para onboarding se necessário e não estiver já lá
        if (!hasActiveContract && !window.location.pathname.includes('/onboarding')) {
          navigate('/personal/payroll/onboarding', { replace: true });
        }
      } catch (err) {
        console.error('Erro ao verificar status do onboarding:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    }

    checkOnboardingStatus();
  }, [user, navigate]);

  return {
    needsOnboarding,
    isLoading,
    error
  };
}

export default usePayrollOnboarding;