import { describe, expect, it } from 'vitest';
import { addUniqueUnitScan, parseUnitScan, returnProgress, validateSelectedReturns } from './custodyWorkflow';

describe('custody workflow helpers', () => {
  it('parses raw unit IDs and existing QR history URLs', () => {
    expect(parseUnitScan(' EQ01-0001 ')).toBe('EQ01-0001');
    expect(parseUnitScan('https://inventory.test/item-history/EQ01-0002')).toBe('EQ01-0002');
    expect(parseUnitScan('https://inventory.test/item-history/EQ%2001')).toBe('EQ 01');
  });

  it('rejects duplicate and unknown scans', () => {
    const allowed = ['EQ01-0001', 'EQ01-0002'];
    expect(addUniqueUnitScan([], 'EQ01-0001', allowed)).toMatchObject({ units: ['EQ01-0001'], error: null });
    expect(addUniqueUnitScan(['EQ01-0001'], 'https://x.test/item-history/EQ01-0001', allowed).error).toBe('duplicate');
    expect(addUniqueUnitScan([], 'EQ99-9999', allowed).error).toBe('unknown');
  });

  it('calculates partial return progress safely', () => {
    expect(returnProgress(4, 1)).toBe(25);
    expect(returnProgress(4, 4)).toBe(100);
    expect(returnProgress(0, 0)).toBe(0);
  });

  it('requires a condition and notes for attention conditions', () => {
    expect(validateSelectedReturns([], {})).toContain('Select at least one');
    expect(validateSelectedReturns(['EQ01-0001'], { 'EQ01-0001': { condition: '' } })).toContain('condition');
    expect(validateSelectedReturns(['EQ01-0001'], { 'EQ01-0001': { condition: 'Damaged', notes: '' } })).toContain('notes');
    expect(validateSelectedReturns(['EQ01-0001'], { 'EQ01-0001': { condition: 'Good', notes: '' } })).toBeNull();
  });
});
