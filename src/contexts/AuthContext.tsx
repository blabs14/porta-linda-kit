/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { logger } from '@/shared/lib/logger';
import { useUserDataInvalidation } from '../hooks/useUserDataInvalidation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: unknown } | void>;
  register: (email: string, password: string, nome?: string) => Promise<{ error: unknown } | void>;
  resetPassword: (email: string) => Promise<{ error: unknown } | void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Hook para invalidar dados do utilizador quando há mudanças de autenticação
  useUserDataInvalidation(user);

  useEffect(() => {
    let mounted = true;
    let initialSessionLoaded = false;
    
    console.log('[Auth] 🚀 Initializing auth context', {
      timestamp: new Date().toISOString(),
      mounted,
      currentUser: user?.id || 'none',
      currentSession: session?.access_token ? 'exists' : 'none'
    });
    
    // Setup auth state listener
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) {
        console.warn('[Auth] ⚠️ onAuthStateChange called but component unmounted, ignoring', { event });
        return;
      }
      
      console.log(`[Auth] 🔄 Auth state changed: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id || 'none',
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none',
        timestamp: new Date().toISOString(),
        mounted,
        initialSessionLoaded,
        event
      });
      
      logger.info(`[Auth] Estado alterado: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at
      });
      
      // Update state atomically
      setSession(session);
      if (session?.user) {
        console.log('🔧 AuthContext: Sessão encontrada, definindo user:', {
          id: session.user.id,
          email: session.user.email
        });
        console.log('🔧 AuthContext: USER ID COMPLETO para debug:', session.user.id);
        setUser(session.user);
      } else {
        console.log('🔧 AuthContext: Nenhuma sessão encontrada');
        setUser(null);
      }
      
      // Always stop loading after any auth state change
      if (loading) {
        console.log('[Auth] 🏁 Auth state changed, stopping loading');
        setLoading(false);
      }
      
      // Mark as initialized
      if (!initialSessionLoaded) {
        initialSessionLoaded = true;
      }
    });
    
    // Get initial session - this will trigger INITIAL_SESSION event
    const initializeAuth = async () => {
      try {
        console.log('[Auth] 🔍 Getting initial session...', {
          timestamp: new Date().toISOString(),
          localStorage: Object.keys(localStorage).filter(k => k.startsWith('sb-')).length + ' supabase keys'
        });
        
        const { data, error } = await supabase.auth.getSession();
        
        if (!mounted) {
          console.warn('[Auth] ⚠️ Component unmounted during getSession, skipping');
          return;
        }
        
        if (error) {
          console.error('[Auth] ❌ Error getting initial session:', error);
          logger.warn('[Auth] Erro ao obter sessão inicial:', error);
          
          // Set state and stop loading on error
          setUser(null);
          setSession(null);
          setLoading(false);
          initialSessionLoaded = true;
        } else {
          console.log('[Auth] 📋 Initial session result:', {
            hasSession: !!data.session,
            userId: data.session?.user?.id || 'none',
            expiresAt: data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'none',
            tokenLength: data.session?.access_token?.length || 0,
            timestamp: new Date().toISOString()
          });
          
          logger.info('[Auth] Sessão inicial carregada', {
            hasSession: !!data.session,
            userId: data.session?.user?.id
          });
          
          // Set initial state immediately
          setUser(data.session?.user ?? null);
          setSession(data.session);
          setLoading(false);
          initialSessionLoaded = true;
        }
      } catch (error) {
        if (!mounted) return;
        
        console.error('[Auth] 💥 Exception getting initial session:', error);
        logger.error('[Auth] Erro crítico ao inicializar autenticação:', error);
        
        // Set safe state and stop loading on exception
        setUser(null);
        setSession(null);
        setLoading(false);
        initialSessionLoaded = true;
      }
    };
    
    initializeAuth();
    
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []); // Empty dependency array to avoid re-initialization

  const login = async (email: string, password: string) => {
    console.log('[Auth] 🔐 Login attempt started', {
      email,
      timestamp: new Date().toISOString(),
      currentUser: user?.id || 'none',
      currentSession: !!session
    });
    
    logger.info('[Auth] Tentativa de login iniciada', { email });
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('[Auth] ❌ Login failed', {
          error: error.message,
          email,
          timestamp: new Date().toISOString()
        });
        logger.warn('[Auth] Falha no login', { error: error.message, email });
      } else {
        console.log('[Auth] ✅ Login successful', {
          userId: data.user?.id,
          email,
          hasSession: !!data.session,
          expiresAt: data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'none',
          timestamp: new Date().toISOString()
        });
        logger.info('[Auth] Login bem-sucedido', { userId: data.user?.id, email });
      }
      
      setLoading(false);
      return { error };
    } catch (error) {
      console.error('[Auth] 💥 Login exception:', error);
      logger.error('[Auth] Erro crítico no login:', error);
      setLoading(false);
      return { error };
    }
  };

  const register = async (email: string, password: string, nome?: string) => {
    setLoading(true);
    
    const signUpData: any = { email, password };
    if (nome) {
      signUpData.options = {
        data: {
          nome: nome
        }
      };
    }
    
    const { error } = await supabase.auth.signUp(signUpData);
    setLoading(false);
    return { error };
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    return { error };
  };

  const logout = async () => {
    console.log('[Auth] 🚪 Logout started', {
      currentUser: user?.id || 'none',
      currentSession: !!session,
      timestamp: new Date().toISOString(),
      tokensInStorage: Object.keys(localStorage).filter(k => k.startsWith('sb-')).length
    });
    
    logger.info('[Auth] Logout iniciado');
    
    try {
      // Don't set loading during logout to avoid UI flicker
      // The onAuthStateChange will handle the state updates
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[Auth] ❌ Logout failed', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        logger.error('[Auth] Erro no logout:', error);
        throw error;
      }
      
      console.log('[Auth] ✅ Logout successful', {
        timestamp: new Date().toISOString(),
        tokensAfterLogout: Object.keys(localStorage).filter(k => k.startsWith('sb-')).length
      });
      logger.info('[Auth] Logout bem-sucedido');
      
      // Force clear state if onAuthStateChange doesn't fire
      setTimeout(() => {
        if (user || session) {
          console.log('[Auth] 🧹 Force clearing auth state after logout timeout');
          setUser(null);
          setSession(null);
        }
      }, 1000);
      
    } catch (error) {
      logger.error('[Auth] Erro crítico no logout:', error);
      // On error, still try to clear local state
      setUser(null);
      setSession(null);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, register, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}