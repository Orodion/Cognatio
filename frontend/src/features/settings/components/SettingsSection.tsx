import type { ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';

interface SettingsSectionProps {
  /** Also the anchor: `/settings#<id>` opens the block */
  id: string;
  icon: LucideIcon;
  title: string;
  /** Current values in one line – shown while the block is closed */
  summary?: string;
  children: ReactNode;
}

/** Collapsible block of the settings page; open or closed is remembered on this device */
export function SettingsSection({ id, icon: Icon, title, summary, children }: SettingsSectionProps) {
  const open = useSettingsStore((s) => s.openSections.includes(id));
  const setSectionOpen = useSettingsStore((s) => s.setSectionOpen);

  return (
    <section id={id} className="scroll-mt-20 rounded-xl border bg-card shadow-xs">
      <h2>
        <button
          type="button"
          className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50', open ? 'rounded-t-xl' : 'rounded-xl')}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          // Only the title is the name of the button; the summary is its description
          aria-labelledby={`${id}-title`}
          aria-describedby={!open && summary ? `${id}-summary` : undefined}
          onClick={() => setSectionOpen(id, !open)}
        >
          <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span id={`${id}-title`} className="shrink-0 text-base font-semibold">
            {title}
          </span>
          <span id={`${id}-summary`} className="min-w-0 flex-1 truncate text-sm font-normal text-muted-foreground">
            {!open && summary}
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </h2>
      {open && (
        <div id={`${id}-body`} role="region" aria-labelledby={`${id}-title`} className="border-t p-4">
          {children}
        </div>
      )}
    </section>
  );
}
