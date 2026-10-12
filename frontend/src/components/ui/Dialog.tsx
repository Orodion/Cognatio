import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** For the dialog box itself, e.g. a larger `max-w-*` */
  className?: string;
}

const TitleIdContext = React.createContext<string | undefined>(undefined);

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog (WAI-ARIA "dialog (modal)"):
 * - rendered outside the app; the app behind it is `inert` (reachable neither by keyboard nor by screen reader)
 * - moves the focus into the dialog when opening, keeps Tab inside and returns the focus when closing
 * - Escape or a click on the backdrop closes it; the title (DialogTitle) names the dialog
 */
export function Dialog({ open, onClose, children, className }: DialogProps) {
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  // onClose often changes with every render – do not reset focus/inert because of that
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  // Element that opened the dialog – gets the focus back when closing.
  // Remember it already while rendering on the switch to "open": fields with autoFocus in the dialog
  // take the focus before any effect runs.
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);
  const wasOpenRef = React.useRef(false);
  if (open && !wasOpenRef.current && typeof document !== 'undefined') {
    const active = document.activeElement as HTMLElement | null;
    restoreFocusRef.current = active && active !== document.body ? active : null;
  }
  wasOpenRef.current = open;

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const appRoot = document.getElementById('root');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      // Tab stays inside the dialog: from the last element back to the first and vice versa
      if (e.key !== 'Tab' || !dialogRef.current) {
        return;
      }
      // Only visible elements (e.g. not in collapsed sections); without checkVisibility everything counts as visible
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.checkVisibility?.() ?? true);
      if (!focusable.length) {
        return;
      }
      const [first, last] = [focusable[0], focusable[focusable.length - 1]];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    appRoot?.setAttribute('inert', '');
    appRoot?.setAttribute('aria-hidden', 'true');

    // Focus the first input or control (unless autoFocus already did)
    const dialog = dialogRef.current;
    if (!dialog?.contains(document.activeElement)) {
      const first =
        dialog?.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]), select, textarea') ?? dialog?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? dialog)?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      appRoot?.removeAttribute('inert');
      appRoot?.removeAttribute('aria-hidden');
      const target = restoreFocusRef.current;
      if (target?.isConnected) {
        target.focus();
        // In case the browser has not applied the removed `inert` yet: try again in the next frame –
        // but only if the focus has not landed anywhere else in the meantime
        requestAnimationFrame(() => {
          if (target.isConnected && (!document.activeElement || document.activeElement === document.body)) {
            target.focus();
          }
        });
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs sm:items-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={cn(
          'relative w-full max-w-2xl animate-in fade-in zoom-in-95 motion-reduce:animate-none rounded-xl border bg-card p-6 text-card-foreground shadow-xl outline-hidden',
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <TitleIdContext.Provider value={titleId}>{children}</TitleIdContext.Provider>
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-6 space-y-1.5', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const titleId = React.useContext(TitleIdContext);
  return <h2 id={titleId} className={cn('text-xl font-semibold leading-none', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-6 flex justify-end gap-3', className)} {...props} />;
}
