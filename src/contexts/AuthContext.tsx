import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authInitialized: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; session: Session | null } | null>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);

  const DEBUG = import.meta.env.VITE_DEBUG_AUTH === 'true';
  const log = (...args: any[]) => {
    if (DEBUG) console.debug('[auth]', ...args);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        log('Bootstrap: getSession start');
        const { data, error } = await supabase.auth.getSession();
        if (error) log('Bootstrap: getSession error', error);
        const initialSession = data?.session ?? null;
        if (!mounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        log('Bootstrap: getSession done', { hasSession: !!initialSession, userId: initialSession?.user?.id });
      } catch (e) {
        log('Bootstrap: unexpected error', e);
      } finally {
        if (!mounted) return;
        setAuthInitialized(true);
        setLoading(false);
        log('Bootstrap: finalized', { authInitialized: true });
      }
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      log('AuthStateChange:', { event, hasSession: !!newSession, userId: newSession?.user?.id });
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED': {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
          setAuthInitialized(true);
          break;
        }
        case 'SIGNED_OUT': {
          setSession(null);
          setUser(null);
          setLoading(false);
          setAuthInitialized(true);
          break;
        }
        case 'PASSWORD_RECOVERY':
        default: {
          // Não altera estado principal; deixar UX própria tratar
          break;
        }
      }
    });

    return () => {
      mounted = false;
      try {
        subscription?.subscription?.unsubscribe?.();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // O listener irá sincronizar o estado; retornamos por conveniência
      return { user: data.user, session: data.session };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    loading,
    authInitialized,
    login,
    register,
    logout,
    resetPassword,
  }), [user, session, loading, authInitialized, login, register, logout, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};