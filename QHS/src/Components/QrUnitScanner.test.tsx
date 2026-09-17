import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QrUnitScanner from './QrUnitScanner';

describe('QrUnitScanner', () => {
  it('keeps manual entry available when camera support is unavailable', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    const onScan = vi.fn();
    render(<QrUnitScanner onScan={onScan} />);

    fireEvent.click(screen.getByRole('button', { name: /start camera/i }));
    expect(await screen.findByText(/not supported/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/scan or enter unit id/i), { target: { value: 'https://inventory.test/item-history/EQ01-0004' } });
    fireEvent.click(screen.getByRole('button', { name: /add unit/i }));
    expect(onScan).toHaveBeenCalledWith('EQ01-0004');
  });
});
