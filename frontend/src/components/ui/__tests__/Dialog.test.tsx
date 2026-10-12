import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog, DialogTitle } from '../Dialog';

afterEach(() => document.getElementById('root')?.remove());

function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Öffnen</button>
      <Dialog
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        <DialogTitle>Neue Person</DialogTitle>
        <input aria-label="Vorname" />
        <button>Speichern</button>
      </Dialog>
    </>
  );
}

function setup(onClose = vi.fn()) {
  // Like in the app: content under #root, the dialog is rendered outside
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  render(<Harness onClose={onClose} />, { container: root });
  return { root, onClose };
}

describe('Dialog', () => {
  it('is named by its title, focuses the first field and makes the app inert', () => {
    const { root } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Öffnen' }));

    const dialog = screen.getByRole('dialog', { name: 'Neue Person' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(root.contains(dialog)).toBe(false);
    expect(root).toHaveAttribute('inert');
    expect(screen.getByLabelText('Vorname')).toHaveFocus();
  });

  it('keeps Tab inside the dialog', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Öffnen' }));
    const save = screen.getByRole('button', { name: 'Speichern' });
    save.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByLabelText('Vorname')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(save).toHaveFocus();
  });

  it('closes on Escape and returns focus to the opener', () => {
    const { root, onClose } = setup();
    const opener = screen.getByRole('button', { name: 'Öffnen' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(root).not.toHaveAttribute('inert');
    expect(opener).toHaveFocus();
  });
});
