import type { TFunction } from 'i18next';
import { Archive, Bot, Download, FileSearch, FileUp, Film, RotateCcw, type LucideIcon } from 'lucide-react';
import type { Activity, ActivityKind } from '@/stores/activityStore';

const ICONS: Record<ActivityKind, LucideIcon> = {
  importCheck: FileSearch,
  import: FileUp,
  restoreCheck: FileSearch,
  restore: RotateCcw,
  export: Download,
  backup: Archive,
  media: Film,
  mcp: Bot,
};

/** Icon of the kind of an activity */
export const activityIcon = (kind: ActivityKind) => ICONS[kind];

/** "Import: familie.zip" – the kind and what it works on */
export const activityTitle = (t: TFunction, activity: Pick<Activity, 'kind' | 'label'>) =>
  t('activity.title', { kind: t(`activity.kinds.${activity.kind}`), label: activity.label });
