import { describe, it, expect } from 'vitest';
import * as svc from './transactions';

describe('transactions service', () => {
  it('getTransactions retorna um array', async () => {
    const { data, error } = await svc.getTransactions();
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
}); 