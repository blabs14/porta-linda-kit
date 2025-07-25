import { supabase } from '../lib/supabaseClient';

export const signInWithGoogle = async () => {
  return supabase.auth.signInWithOAuth({ provider: 'google' });
};

export const signInWithApple = async () => {
  return supabase.auth.signInWithOAuth({ provider: 'apple' });
};

export const signInWithFacebook = async () => {
  return supabase.auth.signInWithOAuth({ provider: 'facebook' });
};

// Adiciona outros providers conforme necessário 