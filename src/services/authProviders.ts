import { supabase } from '../lib/supabaseClient';

export const signInWithGoogle = async (): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const signInWithApple = async (): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'apple' });
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const signInWithFacebook = async (): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'facebook' });
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Adiciona outros providers conforme necessário 