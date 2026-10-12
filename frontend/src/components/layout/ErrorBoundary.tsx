import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { logClient } from '@/lib/clientLog';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** When it changes (e.g. another page is opened) the error is forgotten and the content is shown again */
  resetKey?: string;
  /** Reloads the app (tests replace it) */
  reload?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  resetKey?: string;
}

/**
 * Catches errors while a page is shown: a message with "Reload" instead of an empty window – in the desktop app,
 * which has no menu or address bar, nothing else would be left but closing it. The error goes into the log.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState): Partial<ErrorBoundaryState> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logClient('error', `Error while showing the page: ${error.message}${info.componentStack ?? ''}`);
  }

  render() {
    return this.state.error ? <PageError reload={this.props.reload ?? (() => window.location.reload())} /> : this.props.children;
  }
}

function PageError({ reload }: { reload: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="mx-auto max-w-xl space-y-3 rounded-xl border bg-card p-6 shadow-xs">
      <h1 className="text-lg font-semibold">{t('errorPage.title')}</h1>
      <p className="text-sm text-muted-foreground">{t('errorPage.text')}</p>
      <Button onClick={reload}>{t('errorPage.reload')}</Button>
    </div>
  );
}
