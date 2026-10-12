import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { getClientLog } from '@/lib/clientLog';

function Broken(): never {
  throw new Error('page broke');
}

// React in development reports the caught error once more as an uncaught one; jsdom would print it
const quiet = (event: ErrorEvent) => event.preventDefault();
beforeEach(() => window.addEventListener('error', quiet));
afterEach(() => {
  window.removeEventListener('error', quiet);
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('shows a message with "Reload" instead of the broken content and logs the error', () => {
    // React reports the caught error on the console as well
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reload = vi.fn();
    render(
      <ErrorBoundary reload={reload}>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('errorPage.title');
    expect(screen.getByText('errorPage.text')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'errorPage.reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(getClientLog().some((entry) => entry.level === 'error' && entry.msg.includes('page broke'))).toBe(true);
  });

  it('shows the content again when the reset key changes (another page)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(
      <ErrorBoundary resetKey="/tree">
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(
      <ErrorBoundary resetKey="/persons">
        <p>persons page</p>
      </ErrorBoundary>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('persons page')).toBeInTheDocument();
  });

  it('shows the content as long as nothing goes wrong', () => {
    render(
      <ErrorBoundary>
        <p>fine</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
  });
});
