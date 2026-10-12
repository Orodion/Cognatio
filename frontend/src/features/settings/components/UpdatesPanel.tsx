import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { updatesBridge, type UpdateSettings, type UpdateStatus } from '@/lib/platform';

/** While an update is downloaded the panel asks the shell for the state every few seconds */
const POLL_MS = 3000;

/**
 * Updates of the program: switch for the daily check, "check now" and, when an update is downloaded, "restart
 * and install". Only the Windows app has this (the shell provides it through the platform layer); in the browser
 * nothing is shown.
 */
export function UpdatesPanel() {
  const bridge = updatesBridge();
  if (!bridge) {
    return null;
  }
  return <Panel bridge={bridge} />;
}

function Panel({ bridge }: { bridge: NonNullable<ReturnType<typeof updatesBridge>> }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<UpdateSettings | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      bridge
        .getSettings()
        .then(setSettings)
        .catch(() => undefined),
    [bridge],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const state = settings?.status.state;
  useEffect(() => {
    if (state !== 'downloading' && state !== 'checking') {
      return;
    }
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [state, load]);

  if (!settings || !settings.supported) {
    return null;
  }

  const setStatus = (status: UpdateStatus) => setSettings((current) => (current ? { ...current, status } : current));
  const checkNow = async () => {
    setBusy(true);
    setStatus({ state: 'checking' });
    try {
      setStatus(await bridge.checkNow());
    } finally {
      setBusy(false);
    }
  };
  const { status } = settings;
  const message = {
    off: null,
    idle: null,
    checking: t('settings.updates.checking'),
    'up-to-date': t('settings.updates.upToDate'),
    downloading: t('settings.updates.downloading', { version: status.version }),
    ready: t('settings.updates.ready', { version: status.version }),
    error: t('settings.updates.error', { message: status.message }),
  }[status.state];

  return (
    <div role="group" aria-labelledby="updates-title" className="space-y-3 rounded-lg border p-4">
      <h3 id="updates-title" className="text-sm font-semibold">
        {t('settings.updates.title')}
      </h3>
      <p className="text-xs text-muted-foreground">{t('settings.updates.intro')}</p>
      <label className="flex items-center gap-2 text-sm">
        <input
          id="settings-updates-check"
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={settings.check}
          onChange={(e) => void bridge.setCheck(e.target.checked).then(setSettings)}
        />
        {t('settings.updates.check')}
      </label>
      <div className="space-y-1">
        <label htmlFor="settings-updates-channel" className="text-sm">
          {t('settings.updates.channel')}
        </label>
        <Select
          id="settings-updates-channel"
          className="max-w-sm"
          value={settings.channel}
          onChange={(e) => void bridge.setChannel(e.target.value === 'beta' ? 'beta' : 'stable').then(setSettings)}
        >
          <option value="stable">{t('settings.updates.channelStable')}</option>
          <option value="beta">{t('settings.updates.channelBeta')}</option>
        </Select>
        {settings.channel === 'beta' && <p className="text-xs text-muted-foreground">{t('settings.updates.betaHint')}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {status.state === 'ready' ? (
          <Button id="settings-updates-install" size="sm" onClick={() => void bridge.installNow()}>
            {t('settings.updates.restartNow')}
          </Button>
        ) : (
          <Button id="settings-updates-now" size="sm" variant="outline" onClick={() => void checkNow()} disabled={busy || status.state === 'downloading'}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {t('settings.updates.checkNow')}
          </Button>
        )}
        {message && (
          <p className={status.state === 'error' ? 'text-sm text-destructive' : 'text-sm'} role="status">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
