import { describe, it, expect } from 'vitest';
import { formatCOP } from '../src/utils/formatCOP';

describe('formatCOP', () => {
  it('should format a number as COP currency', () => {
    const result = formatCOP(3858000);
    expect(result).toContain('3.858.000');
  });

  it('should return dash for null', () => {
    expect(formatCOP(null)).toBe('—');
  });

  it('should return dash for undefined', () => {
    expect(formatCOP(undefined)).toBe('—');
  });

  it('should format short millions', () => {
    expect(formatCOP(3858000, { short: true })).toBe('$3.9M');
  });

  it('should format short thousands', () => {
    expect(formatCOP(120000, { short: true })).toBe('$120K');
  });

  it('should format zero', () => {
    const result = formatCOP(0);
    expect(result).toContain('0');
  });

  it('should round decimals', () => {
    const result = formatCOP(1500.7);
    expect(result).toContain('1.501');
  });
});
