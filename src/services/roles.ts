import { supabase } from '../lib/supabaseClient';

// Exemplo de modelo: id, user_id, family_id, role, permissions, created_at
export const getRoles = (family_id: string) =>
  supabase
    .from('family_members')
    .select('user_id, role, permissions')
    .eq('family_id', family_id);

export const updateRole = (user_id: string, family_id: string, role: string, permissions: string[]) =>
  supabase
    .from('family_members')
    .update({ role, permissions })
    .eq('user_id', user_id)
    .eq('family_id', family_id);

// Helpers para roles
export const isAdmin = (role: string) => role === 'admin';
export const isMember = (role: string) => role === 'member';
export const hasRole = (role: string, expected: string) => role === expected;
export const hasPermission = (permissions: string[], permission: string) => permissions.includes(permission); 