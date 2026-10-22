import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, CircleX, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ErrorBox } from '@/features/transfer/components/ErrorBox';
import { TransferProgressBar } from '@/features/transfer/components/TransferProgressBar';
import { cancelActivity, runningProgress } from '@/lib/activity';
import { formatBytes } from '@/lib/formatSize';
import { formatDateTime } from '@/lib/formatDate';
import { useActivityStore, type Activity } from '@/stores/activityStore';
import { activityIcon, activityTitle } from '@/features/activity/lib/activityText';

/** Line about the result of a finished activity: activity.results.<kind>, sizes formatted */
function useResultText() {
  const { t } = useTranslation();
  return (activity: Activity) => {
    const values = { ...activity.result };
    if (activity.kind === 'mcp') {
      // A change of an AI assistant: who did what; a refusal with its reason
      const action = t(`activity.mcpTools.${values.tool}`, { defaultValue: String(values.tool) });
      const client = values.client || t('activity.mcpClient');
      return values.reason
        ? t('activity.results.mcpFailed', { client, action, reason: t(`activity.mcpReasons.${values.reason}`, { defaultValue: String(values.reason) }) })
        : t('activity.results.mcp', { client, action });
    }
    if (typeof values.size === 'number') {
      values.size = formatBytes(values.size);
    }
    const missing = Number(values.missing ?? 0);
    return [t(`activity.results.${activity.kind}`, values), missing > 0 ? t('activity.missingMedia', { count: missing }) : null].filter(Boolean).join(' ');
  };
}

/**
 * Long operations of this session (uploads, checks, import, restore, export and backup downloads): the running ones
 * with progress and "Cancel", the finished ones with their result until they are removed or the app is closed.
 */
export function ActivityPage() {
  const { t, i18n } = useTranslation();
  const activities = useActivityStore((state) => state.activities);
  const remove = useActivityStore((state) => state.remove);
  const clearFinished = useActivityStore((state) => state.clearFinished);
  const markSeen = useActivityStore((state) => state.markSeen);
  const resultText = useResultText();
  const running = activities.filter((a) => a.state === 'running');
  const finished = activities.filter((a) => a.state !== 'running');

  // What ended is seen here: the warning in the sidebar goes away
  useEffect(() => {
    if (finished.some((a) => !a.seen)) {
      markSeen();
    }
  }, [finished, markSeen]);

  const title = (activity: Activity) => activityTitle(t, activity);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.activity')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('activity.subtitle')}</p>
      </div>

      {activities.length === 0 && <p className="text-sm text-muted-foreground">{t('activity.empty')}</p>}

      {running.length > 0 && (
        <section className="space-y-3" aria-labelledby="activity-running">
          <h2 id="activity-running" className="text-sm font-medium text-muted-foreground">
            {t('activity.running')}
          </h2>
          {running.map((activity) => {
            const Icon = activityIcon(activity.kind);
            return (
              <Card key={activity.id} data-testid="activity-running">
                <CardContent className="space-y-2 pt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 break-all font-medium">{title(activity)}</span>
                    {activity.link && (
                      <Link to={activity.link} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        {t('activity.open')}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                  <TransferProgressBar
                    progress={runningProgress(activity)}
                    onCancel={activity.cancel ? () => cancelActivity(activity.id) : undefined}
                    cancelling={activity.cancelling}
                  />
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {finished.length > 0 && (
        <section className="space-y-3" aria-labelledby="activity-finished">
          <div className="flex items-center gap-2">
            <h2 id="activity-finished" className="flex-1 text-sm font-medium text-muted-foreground">
              {t('activity.finished')}
            </h2>
            <Button size="sm" variant="outline" onClick={clearFinished}>
              {t('activity.clearFinished')}
            </Button>
          </div>
          <ul className="divide-y rounded-lg border">
            {finished.map((activity) => (
              <li key={activity.id} className="space-y-2 px-4 py-3 text-sm" data-testid="activity-finished">
                <div className="flex items-start gap-2">
                  {activity.state === 'done' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-label={t('activity.states.done')} />
                  ) : activity.state === 'failed' ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-label={t('activity.states.failed')} />
                  ) : (
                    <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-label={t('activity.states.cancelled')} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-medium">{title(activity)}</p>
                    <p className="text-muted-foreground">
                      {activity.state === 'done' || activity.kind === 'mcp'
                        ? resultText(activity)
                        : activity.state === 'cancelled'
                          ? t('activity.cancelled')
                          : null}
                      {activity.finishedAt && (
                        <span className="whitespace-nowrap"> · {formatDateTime(new Date(activity.finishedAt).toISOString(), i18n.language)}</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(activity.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    aria-label={t('activity.remove', { title: title(activity) })}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {activity.state === 'failed' && activity.error && <ErrorBox error={activity.error} />}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
