import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './ui/loading-states';

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, authInitialized } = useAuth();
  const navigate = useNavigate();

  const DEBUG = import.meta.env.VITE_DEBUG_AUTH === 'true';

  if (DEBUG) {
    console.debug('[auth] RequireAuth render', {
      user: !!user,
      userId: user?.id,
      loading,
      authInitialized,
      timestamp: new Date().toISOString()
    });
  }

  useEffect(() => {
    if (DEBUG) {
      console.debug('[auth] RequireAuth effect', {
        loading,
        authInitialized,
        user: !!user,
        userId: user?.id,
        willRedirect: authInitialized && !loading && user === null
      });
    }

    if (authInitialized && !loading && user === null) {
      if (DEBUG) console.debug('[auth] Redirecting to /login from RequireAuth');
      navigate('/login', { replace: true });
    }
  }, [user, loading, authInitialized, navigate, DEBUG]);

  if (loading || !authInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-busy="true" aria-live="polite">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (user === null) return null;
  return <>{children}</>;
};

export default RequireAuth;