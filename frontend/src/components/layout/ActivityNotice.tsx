import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { hasNativeDownload } from '@/lib/platform';
import { useActivityStore, type Activity } from '@/stores/activityStore';
import { activityTitle } from '@/features/activity/lib/activityText';

/** How long the notice about an ended activity stays */
export const NOTICE_MS = 10_000;

/**
 * Small notice when an activity ends while the user is on another page ("Import finished · Show"), and the question
 * before closing the tab while a file is being uploaded from the browser (it would be lost). The desktop app closes
 * through its own window – there the question would block closing without a dialog.
 */
export function ActivityNotice() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const activities = useActivityStore((state) => state.activities);
  const [notice, setNotice] = useState<Activity | null>(null);
  const announced = useRef(new Set<string>());

  useEffect(() => {
    const ended = activities.find((a) => a.state !== 'running' && !a.seen && !announced.current.has(a.id));
    if (!ended) {
      return;
    }
    announced.current.add(ended.id);
    // On the page of the operation or on "Activity" the user sees the end already
    const here = pathname === '/activity' || (ended.link && ended.link.split('#')[0] === pathname);
    if (here) {
      useActivityStore.getState().update(ended.id, { seen: true });
    } else {
      setNotice(ended);
    }
  }, [activities, pathname]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const uploading = activities.some((a) => a.state === 'running' && a.phase === 'upload');
  useEffect(() => {
    if (!uploading || hasNativeDownload()) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [uploading]);

  if (!notice) {
    return null;
  }
  const failed = notice.state === 'failed';
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm" data-testid="activity-notice">
      <div className="pointer-events-auto flex items-start gap-2 rounded-lg border bg-card p-3 text-sm shadow-lg" role="status">
        {failed ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        )}
        <p className="min-w-0 flex-1 break-words">
          {t(`activity.notice.${notice.state}`, { title: activityTitle(t, notice) })}{' '}
          <Link to="/activity" className="font-medium text-primary hover:underline" onClick={() => setNotice(null)}>
            {t('activity.show')}
          </Link>
        </p>
        <button type="button" onClick={() => setNotice(null)} className="rounded p-0.5 text-muted-foreground hover:bg-accent" aria-label={t('common.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
