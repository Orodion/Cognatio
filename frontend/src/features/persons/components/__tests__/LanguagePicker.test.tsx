import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguagePicker } from '../LanguagePicker';

describe('LanguagePicker', () => {
  it('adds a language via the + button and select', () => {
    const onChange = vi.fn();
    render(<LanguagePicker id="languages" value={['de']} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /form.addLanguage/ }));
    const select = screen.getByRole('combobox');
    // Languages already chosen are no longer offered
    expect(select.querySelector('option[value="de"]')).toBeNull();

    fireEvent.change(select, { target: { value: 'ru' } });
    expect(onChange).toHaveBeenCalledWith(['de', 'ru']);
  });

  it('removes a language via its chip', () => {
    const onChange = vi.fn();
    render(<LanguagePicker id="languages" value={['de', 'en']} onChange={onChange} />);

    fireEvent.click(screen.getAllByRole('button', { name: /form.removeLanguage/ })[0]);
    expect(onChange).toHaveBeenCalledWith(['en']);
  });

  it('keeps legacy free-text entries readable', () => {
    render(<LanguagePicker id="languages" value={['Plattdeutsch']} onChange={() => {}} />);
    expect(screen.getByText('Plattdeutsch')).toBeInTheDocument();
  });
});
