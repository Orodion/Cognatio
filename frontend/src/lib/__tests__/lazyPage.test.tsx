import { describe, it, expect, vi, beforeEach, onTestFinished } from 'vitest';
import { Component, Suspense, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { lazyPage } from '../lazyPage';

class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? <p>Fehler</p> : this.props.children;
  }
}

const show = (Page: ReturnType<typeof lazyPage>) =>
  render(
    <Boundary>
      <Suspense fallback={<p>Lädt</p>}>
        <Page />
      </Suspense>
    </Boundary>,
  );

beforeEach(() => sessionStorage.clear());

describe('lazyPage', () => {
  it('shows the fallback and then the loaded page', async () => {
    show(lazyPage(async () => () => <h1>FamilyTree</h1>));
    expect(screen.getByText('Lädt')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'FamilyTree' })).toBeInTheDocument();
  });

  it('reloads once if the file of an old version is missing, then reports the error', async () => {
    // React also reports the page's error as unhandled – do not print it in the test
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const silence = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', silence);
    onTestFinished(() => window.removeEventListener('error', silence));
    const reload = vi.fn();
    const failing = () => Promise.reject(new Error('Failed to fetch dynamically imported module'));

    show(lazyPage(failing, reload));
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Lädt')).toBeInTheDocument();

    // After the reload the file is still missing: no further reload, but an error
    show(lazyPage(failing, reload));
    expect(await screen.findByText('Fehler')).toBeInTheDocument();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
