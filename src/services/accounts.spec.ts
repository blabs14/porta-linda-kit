import { describe, it, expect } from 'vitest';
import * as svc from './accounts';
import { supabase } from '../lib/supabaseClient';

function randomEmail() {
  return `test_${Math.random().toString(36).substring(2, 10)}@test.com`;
}

describe('accounts service', () => {
  it('getAccounts retorna um array', async () => {
    const { data, error } = await svc.getAccounts();
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('auth flow', () => {
  it('regista e faz login com sucesso', async () => {
    const email = randomEmail();
    const password = 'password123';
    const nome = 'Teste Automatizado';

    // Registo
    const signupRes = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } }
    });
    expect(signupRes.error).toBeNull();
    expect(signupRes.data.user?.email).toBe(email);

    // Login
    const loginRes = await supabase.auth.signInWithPassword({ email, password });
    expect(loginRes.error).toBeNull();
    expect(loginRes.data.user?.email).toBe(email);
  });
}); 