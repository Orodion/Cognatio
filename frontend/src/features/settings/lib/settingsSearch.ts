/** The settings of the settings page that the search field can find */

/** A setting that can be found: the element to focus, its label and the block it is in */
export interface SettingEntry {
  /** `id` of the field or button */
  id: string;
  /** Text key of the label */
  label: string;
  /** Block: `system` (always visible) or the id of a collapsible block */
  section: string;
}

/** All settings of the page with their blocks – the search works on this list */
export const SETTING_ENTRIES: SettingEntry[] = [
  { id: 'settings-language', label: 'header.language', section: 'system' },
  { id: 'settings-theme', label: 'settings.display.theme', section: 'system' },
  { id: 'settings-log-level', label: 'settings.system.logLevel', section: 'system' },
  { id: 'settings-logs-view', label: 'settings.logs.view', section: 'system' },
  { id: 'settings-logs-export', label: 'settings.logs.export', section: 'system' },
  { id: 'settings-logs-clear', label: 'settings.logs.clear', section: 'system' },
  { id: 'appearance-font', label: 'settings.appearance.fields.font', section: 'fontColors' },
  { id: 'appearance-fontSize', label: 'settings.appearance.fields.fontSize', section: 'fontColors' },
  { id: 'appearance-accent', label: 'settings.appearance.fields.accent', section: 'fontColors' },
  { id: 'appearance-lineStyle', label: 'settings.appearance.fields.lineStyle', section: 'treeAppearance' },
  { id: 'appearance-lineWidth', label: 'settings.appearance.fields.lineWidth', section: 'treeAppearance' },
  { id: 'appearance-partnerLine', label: 'settings.appearance.fields.partnerLine', section: 'treeAppearance' },
  { id: 'appearance-lineColor', label: 'settings.appearance.fields.lineColor', section: 'treeAppearance' },
  { id: 'appearance-cardDensity', label: 'settings.appearance.fields.density', section: 'treeAppearance' },
  { id: 'appearance-cardCorner', label: 'settings.appearance.fields.corner', section: 'treeAppearance' },
  { id: 'appearance-cardBorder', label: 'settings.appearance.fields.border', section: 'treeAppearance' },
  { id: 'appearance-treeFont', label: 'settings.appearance.fields.treeFont', section: 'treeAppearance' },
  { id: 'appearance-showPhoto', label: 'settings.appearance.fields.showPhoto', section: 'treeAppearance' },
  { id: 'appearance-showDates', label: 'settings.appearance.fields.showDates', section: 'treeAppearance' },
  { id: 'appearance-showRibbon', label: 'settings.appearance.fields.showRibbon', section: 'treeAppearance' },
  { id: 'appearance-maleColor', label: 'settings.appearance.fields.male', section: 'treeAppearance' },
  { id: 'appearance-femaleColor', label: 'settings.appearance.fields.female', section: 'treeAppearance' },
  { id: 'appearance-unknownColor', label: 'settings.appearance.fields.unknown', section: 'treeAppearance' },
  { id: 'appearance-treeBackground', label: 'tree.background.label', section: 'treeAppearance' },
  { id: 'settings-tree-view', label: 'settings.tree.view', section: 'treeBehaviour' },
  { id: 'settings-tree-depth', label: 'settings.tree.depth', section: 'treeBehaviour' },
  { id: 'settings-tree-focus', label: 'settings.tree.focus', section: 'treeBehaviour' },
  { id: 'settings-backup-download', label: 'settings.backup.download', section: 'data' },
  { id: 'settings-backup-restore', label: 'settings.backup.restoreButton', section: 'data' },
  { id: 'settings-limit-import', label: 'settings.limits.import', section: 'data' },
  { id: 'settings-limit-backup', label: 'settings.limits.backup', section: 'data' },
  { id: 'settings-mcp-enabled', label: 'settings.mcp.enable', section: 'mcp' },
];

/** Lower case without accents, so "schrift" finds "Schriftgröße" and "cafe" finds "café" */
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Entries whose label or block name contains every word of the query */
export function matchSettings<T extends { label: string; blockTitle: string }>(entries: T[], query: string): T[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }
  return entries.filter((entry) => {
    const haystack = normalize(`${entry.label} ${entry.blockTitle}`);
    return words.every((word) => haystack.includes(word));
  });
}
