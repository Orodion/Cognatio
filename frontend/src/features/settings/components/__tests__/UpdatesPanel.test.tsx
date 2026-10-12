import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@/i18n';
import i18n from '@/i18n';
import { UpdatesPanel } from '../UpdatesPanel';
import type { UpdateSettings, UpdatesBridge } from '@/lib/platform';

const settings = (overrides: Partial<UpdateSettings> = {}): UpdateSettings => ({
  supported: true,
  check: true,
  channel: 'stable',
  status: { state: 'idle' },
  ...overrides,
});

function install(partial: Partial<UpdatesBridge> = {}, initial = settings()) {
  const bridge: UpdatesBridge = {
    getSettings: vi.fn(async () => initial),
    setCheck: vi.fn(async (check: boolean) => ({ ...initial, check })),
    setChannel: vi.fn(async (channel: 'stable' | 'beta') => ({ ...initial, channel })),
    checkNow: vi.fn(async () => ({ state: 'up-to-date' as const })),
    installNow: vi.fn(async () => undefined),
    ...partial,
  };
  window.cognatioPlatform = { updates: bridge };
  return bridge;
}

afterEach(async () => {
  delete window.cognatioPlatform;
  await i18n.changeLanguage('en');
});

describe('UpdatesPanel', () => {
  it('shows nothing in the browser', () => {
    const { container } = render(<UpdatesPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing where there is nothing to update', async () => {
    const bridge = install({}, settings({ supported: false }));
    const { container } = render(<UpdatesPanel />);
    await waitFor(() => expect(bridge.getSettings).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('stores the channel and warns about test versions', async () => {
    const bridge = install();
    render(<UpdatesPanel />);
    const select = await screen.findByRole('combobox', { name: 'Versions' });
    expect(select).toHaveValue('stable');
    expect(screen.queryByText(/Test versions come before the release/)).toBeNull();
    fireEvent.change(select, { target: { value: 'beta' } });
    await waitFor(() => expect(bridge.setChannel).toHaveBeenCalledWith('beta'));
    expect(await screen.findByText(/Test versions come before the release/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Versions' })).toHaveValue('beta');
  });

  it('stores the switch for the daily check', async () => {
    const bridge = install();
    render(<UpdatesPanel />);
    const box = await screen.findByRole('checkbox', { name: 'Check for updates automatically' });
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(bridge.setCheck).toHaveBeenCalledWith(false);
    await waitFor(() => expect(box).not.toBeChecked());
  });

  it('checks now and shows the result', async () => {
    const bridge = install();
    render(<UpdatesPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check now' }));
    expect(bridge.checkNow).toHaveBeenCalled();
    expect(await screen.findByText('Cognatio is up to date.')).toBeInTheDocument();
  });

  it('shows an error of the check', async () => {
    install({ checkNow: vi.fn(async () => ({ state: 'error' as const, message: 'feed not found' })) });
    render(<UpdatesPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check now' }));
    expect(await screen.findByText('The update check failed: feed not found')).toBeInTheDocument();
  });

  it('offers "restart and install" for a downloaded update', async () => {
    const bridge = install({}, settings({ status: { state: 'ready', version: '1.2.0' } }));
    render(<UpdatesPanel />);
    expect(await screen.findByText('Version 1.2.0 is ready and is installed when you restart.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check now' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Restart and install' }));
    expect(bridge.installNow).toHaveBeenCalled();
  });

  it('disables "check now" while an update downloads', async () => {
    install({}, settings({ status: { state: 'downloading', version: '1.2.0' } }));
    render(<UpdatesPanel />);
    expect(await screen.findByText('Version 1.2.0 is being downloaded …')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check now' })).toBeDisabled();
  });
});
