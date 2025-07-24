import { describe, it, expect } from 'vitest';
import * as svc from './budgets';

describe('budgets service', () => {
  it('getBudgets retorna um array', async () => {
    const { data, error } = await svc.getBudgets();
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
}); 