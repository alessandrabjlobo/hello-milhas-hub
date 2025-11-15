import { describe, it, expect } from 'vitest';
import { formatMiles } from '@/lib/utils';

describe('formatMiles', () => {
  it('should format 1000 as "1.000"', () => {
    expect(formatMiles(1000)).toBe('1.000');
  });

  it('should format 10000 as "10.000"', () => {
    expect(formatMiles(10000)).toBe('10.000');
  });

  it('should format 50000 as "50.000"', () => {
    expect(formatMiles(50000)).toBe('50.000');
  });

  it('should format 100000 as "100.000"', () => {
    expect(formatMiles(100000)).toBe('100.000');
  });

  it('should format 1000000 as "1.000.000"', () => {
    expect(formatMiles(1000000)).toBe('1.000.000');
  });

  it('should format 0 as "0"', () => {
    expect(formatMiles(0)).toBe('0');
  });

  it('should format 999 as "999"', () => {
    expect(formatMiles(999)).toBe('999');
  });

  it('should format 1234567 as "1.234.567"', () => {
    expect(formatMiles(1234567)).toBe('1.234.567');
  });
});
