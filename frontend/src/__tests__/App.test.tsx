import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, useLocation } from 'react-router-dom';
import App from '../App';

// Only the routes are tested here: layout and pages are stand-ins
vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: function Layout() {
    const { pathname } = useLocation();
    return (
      <div data-testid="path" data-path={pathname}>
        <Outlet />
      </div>
    );
  },
}));
vi.mock('@/features/dashboard/pages/DashboardPage', () => ({ DashboardPage: () => <p>dashboard</p> }));
vi.mock('@/features/persons/pages/PersonListPage', () => ({ PersonListPage: () => <p>persons</p> }));

const show = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  );

describe('App routes', () => {
  it('leads an unknown address to the overview instead of an empty page', async () => {
    show('/no-such-page/42');
    expect(await screen.findByText('dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveAttribute('data-path', '/');
  });

  it('opens a known page', async () => {
    show('/persons');
    expect(await screen.findByText('persons')).toBeInTheDocument();
  });
});
