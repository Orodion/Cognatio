import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClearableInput } from '../ClearableInput';

describe('ClearableInput', () => {
  it('shows a clear button only when there is a value', () => {
    const onClear = vi.fn();
    const { rerender } = render(<ClearableInput value="" onChange={() => {}} onClear={onClear} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<ClearableInput value="Max" onChange={() => {}} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
