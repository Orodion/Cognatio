import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateInput } from '../DateInput';

function Controlled({ initial = '', onChange = vi.fn(), showPrecision }: { initial?: string; onChange?: (v: string) => void; showPrecision?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <DateInput
      id="date"
      value={value}
      showPrecision={showPrecision}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

const picker = () => document.querySelector<HTMLInputElement>('input[type="date"]')!;

describe('DateInput', () => {
  it('shows the recognised precision for valid input only', () => {
    render(<Controlled />);
    const input = document.getElementById('date')!;
    fireEvent.change(input, { target: { value: 'um 1980' } });
    expect(screen.getByText('form.detectedPrecision')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'irgendwann' } });
    expect(screen.queryByText('form.detectedPrecision')).not.toBeInTheDocument();
  });

  it('can hide the precision', () => {
    render(<Controlled initial="1980" showPrecision={false} />);
    expect(screen.queryByText('form.detectedPrecision')).not.toBeInTheDocument();
  });

  it('opens the calendar with the current date and takes over the chosen day', () => {
    const onChange = vi.fn();
    render(<Controlled initial="04.01.1980" onChange={onChange} />);
    const showPicker = vi.fn();
    picker().showPicker = showPicker;

    fireEvent.click(screen.getByRole('button', { name: 'form.openCalendar' }));
    expect(showPicker).toHaveBeenCalled();
    expect(picker().value).toBe('1980-01-04');

    fireEvent.change(picker(), { target: { value: '1981-02-03' } });
    expect(onChange).toHaveBeenLastCalledWith('03.02.1981');
    expect(document.getElementById('date')).toHaveValue('03.02.1981');
  });

  it('falls back to focusing the calendar if it cannot be opened directly', () => {
    render(<Controlled />);
    picker().showPicker = () => {
      throw new Error('NotAllowedError');
    };
    const click = vi.spyOn(picker(), 'click');
    fireEvent.click(screen.getByRole('button', { name: 'form.openCalendar' }));
    expect(click).toHaveBeenCalled();
  });

  it('clears the value with the X button', () => {
    const onChange = vi.fn();
    render(<Controlled initial="1980" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.clear' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
