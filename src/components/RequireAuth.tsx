import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './ui/loading-states';

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Debug: verificar estado da autenticação
  console.log('🔐 RequireAuth - Estado da autenticação:', {
    userId: user?.id,
    userEmail: user?.email,
    loading,
    hasUser: !!user,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    if (!loading && user === null) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (user === null) return null;
  return <>{children}</>;
};

export default RequireAuth;