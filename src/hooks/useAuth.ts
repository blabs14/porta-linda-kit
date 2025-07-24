import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { signupSchema, loginSchema, SignupFormData, LoginFormData } from '../models/authSchema';

export function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(r => setUser(r.data.session?.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  const signup = useCallback(async (data: SignupFormData) => {
    const parsed = signupSchema.parse(data);
    const { email, password, nome } = parsed;
    const payload = {
      email,
      password,
      options: { data: { nome } }
    };
    console.log('[SIGNUP] Payload enviado:', payload);
    const res = await supabase.auth.signUp(payload);
    console.log('[SIGNUP] Resposta do Supabase:', res);
    return res;
  }, []);

  const login = useCallback(async (data: LoginFormData) => {
    const parsed = loginSchema.parse(data);
    const { email, password } = parsed;
    const payload = { email, password };
    console.log('[LOGIN] Payload enviado:', payload);
    const res = await supabase.auth.signInWithPassword(payload);
    console.log('[LOGIN] Resposta do Supabase:', res);
    return res;
  }, []);

  const logout = useCallback(() => supabase.auth.signOut(), []);

  const refreshSession = useCallback((access_token: string, refresh_token: string) =>
    supabase.auth.setSession({ access_token, refresh_token }),
  []);

  return { user, signup, login, logout, refreshSession };
} 