import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface BarListItem {
  key: string;
  label: string;
  value: number;
}

interface BarListProps {
  items: BarListItem[];
  /** Label of the list for screen readers */
  label: string;
  /** Basis for the share in the tooltip (default: sum of the values) */
  total?: number;
  /** Width of the label column */
  labelWidth?: string;
}

/**
 * Horizontal bars for one series (one colour, common baseline).
 * Every value is shown at the end of its bar; hover/focus also shows the share.
 */
export function BarList({ items, label, total, labelWidth = 'w-32' }: BarListProps) {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...items.map((i) => i.value));
  const sum = total ?? items.reduce((s, i) => s + i.value, 0);
  const number = new Intl.NumberFormat(i18n.language);
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 });

  return (
    <ul className="space-y-1" aria-label={label}>
      {items.map((item) => {
        const isActive = active === item.key;
        const share = sum ? item.value / sum : 0;
        return (
          <li
            key={item.key}
            tabIndex={0}
            className="relative flex items-center gap-3 rounded-md px-1 py-1 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            onPointerEnter={() => setActive(item.key)}
            onPointerLeave={() => setActive((a) => (a === item.key ? null : a))}
            onFocus={() => setActive(item.key)}
            onBlur={() => setActive((a) => (a === item.key ? null : a))}
            aria-label={t('statistics.barAria', { label: item.label, value: number.format(item.value), share: percent.format(share) })}
          >
            <span className={cn('shrink-0 truncate text-muted-foreground', labelWidth)} title={item.label}>
              {item.label}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={cn('h-4 rounded-r bg-chart transition-opacity', active && !isActive && 'opacity-60')}
                style={{ width: `${(item.value / max) * 100}%`, minWidth: item.value ? 2 : 0 }}
                aria-hidden="true"
              />
              <span className="shrink-0 tabular-nums">{number.format(item.value)}</span>
            </span>
            {isActive && (
              <span
                role="tooltip"
                className="pointer-events-none absolute -top-9 right-0 z-10 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
              >
                <strong className="font-semibold">{number.format(item.value)}</strong>
                <span className="text-muted-foreground">
                  {' '}
                  · {percent.format(share)} · {item.label}
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
