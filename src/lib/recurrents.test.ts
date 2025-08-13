import { describe, it, expect } from 'vitest';
import { advanceNextRunDate, makePeriodKey } from './recurrents';

describe('recurrents utils', () => {
  it('advanceNextRunDate month handles month-end safely', () => {
    expect(advanceNextRunDate('2024-01-31','month',1)).toMatch(/^2024-02-(2[8-9]|29)$/);
  });
  it('advanceNextRunDate week/day/year', () => {
    expect(advanceNextRunDate('2025-01-01','day',1)).toBe('2025-01-02');
    expect(advanceNextRunDate('2025-01-01','week',1)).toBe('2025-01-08');
    expect(advanceNextRunDate('2025-01-01','year',1)).toBe('2026-01-01');
  });
  it('makePeriodKey formats correctly', () => {
    expect(makePeriodKey('2025-08-12','day')).toBe('2025-08-12');
    expect(makePeriodKey('2025-08-12','month')).toBe('2025-08');
    expect(makePeriodKey('2025-08-12','year')).toBe('2025');
  });
}); 