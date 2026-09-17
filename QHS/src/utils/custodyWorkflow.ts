export const ATTENTION_CONDITIONS = ['Damaged', 'Missing', 'Under Repair'] as const;

export function parseUnitScan(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    const historyIndex = segments.indexOf('item-history');
    const unitSegment = historyIndex >= 0 ? segments[historyIndex + 1] : segments.at(-1);
    return unitSegment ? decodeURIComponent(unitSegment).trim() : '';
  } catch {
    return trimmed;
  }
}

export function addUniqueUnitScan(current: string[], rawValue: string, allowed: string[]) {
  const unitId = parseUnitScan(rawValue);
  if (!unitId || !allowed.includes(unitId)) return { units: current, error: 'unknown' as const, unitId };
  if (current.includes(unitId)) return { units: current, error: 'duplicate' as const, unitId };
  return { units: [...current, unitId], error: null, unitId };
}

export function returnProgress(issuedCount: number, returnedCount: number): number {
  if (issuedCount <= 0) return 0;
  return Math.min(100, Math.max(0, (returnedCount / issuedCount) * 100));
}

export function validateSelectedReturns(
  selectedUnitIds: string[],
  details: Record<string, { condition?: string; notes?: string }>,
): string | null {
  if (selectedUnitIds.length === 0) return 'Select at least one outstanding unit.';

  for (const unitId of selectedUnitIds) {
    const detail = details[unitId];
    if (!detail?.condition) return `Choose a return condition for ${unitId}.`;
    if (ATTENTION_CONDITIONS.includes(detail.condition as typeof ATTENTION_CONDITIONS[number]) && !detail.notes?.trim()) {
      return `Add notes for ${unitId} because it needs attention.`;
    }
  }

  return null;
}
