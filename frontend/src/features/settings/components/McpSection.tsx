import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, type ApolloCache } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, Copy, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { useFamilyTrees } from '@/features/family-trees/lib/useFamilyTrees';
import { DISABLE_MCP, ENABLE_MCP, MCP_SETTINGS, RENEW_MCP_TOKEN, SET_MCP_EXCLUDED_TREES, SET_MCP_PERMISSIONS } from '@/features/settings/graphql/mcpQueries';
import {
  CHECK_LEVELS,
  allState,
  changesForAll,
  claudeCodeCommand,
  clientJson,
  isTicked,
  levelAfter,
  permissionSummary,
  warningForChanges,
  type CheckLevel,
  type McpPermission,
  type McpSettings,
  type PermissionChange,
} from '@/features/settings/lib/mcp';
import { apiErrorMessage } from '@/lib/apiErrors';
import { copyText } from '@/lib/clipboard';

const REFETCH = { refetchQueries: ['McpSettings'] };

/**
 * A change of the boxes writes its answer straight into the settings: shown at once (optimistic) and not loaded again,
 * so the other boxes stay as they are
 */
const intoSettings = <K extends string>(field: K) => ({
  update: (cache: ApolloCache<unknown>, { data }: { data?: Partial<Record<K, McpSettings>> | null }) => {
    const settings: McpSettings | undefined = data?.[field];
    if (settings) {
      cache.writeQuery<{ mcpSettings: McpSettings }>({ query: MCP_SETTINGS, data: { mcpSettings: settings } });
    }
  },
});

/** A text to copy with its button ("Copied" for a moment) */
function CopyField({ id, label, value, multiline = false }: { id: string; label: string; value: string; multiline?: boolean }) {
  const { t } = useTranslation();
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copied = state === 'copied';
  const copy = async () => {
    if (await copyText(value)) {
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
      return;
    }
    // Not possible here: the text is selected, so Ctrl+C copies it
    const field = document.getElementById(id);
    if (field) {
      window.getSelection()?.selectAllChildren(field);
    }
    setState('failed');
  };
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-start gap-2">
        <pre
          id={id}
          tabIndex={0}
          className={`min-w-0 flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-xs ${multiline ? 'whitespace-pre-wrap' : 'overflow-x-auto whitespace-nowrap'} break-all`}
        >
          {value}
        </pre>
        <Button type="button" size="sm" variant="outline" onClick={() => void copy()} aria-label={t('settings.mcp.copy', { what: label })}>
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? t('settings.mcp.copied') : t('settings.mcp.copyShort')}
        </Button>
      </div>
      {state === 'failed' && (
        <p className="text-xs text-destructive" role="alert">
          {t('settings.mcp.copyFailed')}
        </p>
      )}
    </div>
  );
}

/**
 * Text of the level of an area; a level that grants nothing more in this area (e.g. "delete" for statistics) shows the
 * text of the highest level below it that has one
 */
const levelTextKeys = (area: string, level: CheckLevel) =>
  CHECK_LEVELS.slice(0, CHECK_LEVELS.indexOf(level) + 1)
    .reverse()
    .map((l) => `settings.mcp.areas.${area}.${l}`);

/** All family trees visible to assistants, none or some of them */
const treesState = (trees: Array<{ id: string }>, excluded: string[]) => {
  const visible = trees.filter((tree) => !excluded.includes(tree.id)).length;
  return visible === trees.length ? 'all' : visible === 0 ? 'none' : 'some';
};

/** Changes that wait for the warning: of one area or of all areas at once */
interface PendingChange {
  changes: PermissionChange[];
  warning: 'write' | 'delete';
  /** The area of a single change; null: all areas */
  area: string | null;
}

interface AllBoxProps {
  state: 'all' | 'some' | 'none';
  label: string;
  disabled: boolean;
  onChange: (ticked: boolean) => void;
}

/** Box that ticks or unticks all at once (a level for all areas, all family trees); partly ticked when only some are */
function AllBox({ state, label, disabled, onChange }: AllBoxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === 'some';
    }
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 accent-primary"
      aria-label={label}
      checked={state === 'all'}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

interface PermissionTableProps {
  permissions: McpPermission[];
  disabled: boolean;
  onRequest: (changes: PermissionChange[], area: string | null) => void;
}

/**
 * The permissions as boxes: one row per area, one column per level. A higher level includes the lower ones; the row
 * "all areas" sets a level everywhere at once.
 */
function PermissionTable({ permissions, disabled, onRequest }: PermissionTableProps) {
  const { t } = useTranslation();
  const column = (level: CheckLevel) => t(`settings.mcp.columns.${level}`);
  const allAreas = t('settings.mcp.allAreas');

  const tickArea = (permission: McpPermission, level: CheckLevel, ticked: boolean) => {
    const next = levelAfter(permission, level, ticked);
    if (next !== permission.level) {
      onRequest([{ area: permission.area, from: permission.level, level: next }], permission.area);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="px-3 py-2 font-medium">
              {t('settings.mcp.area')}
            </th>
            {CHECK_LEVELS.map((level) => (
              <th key={level} scope="col" className="w-24 px-3 py-2 text-center font-medium">
                {column(level)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          <tr className="bg-muted/40">
            <th scope="row" className="px-3 py-2 text-left font-medium">
              {allAreas}
            </th>
            {CHECK_LEVELS.map((level) => (
              <td key={level} className="px-3 py-2 text-center">
                <AllBox
                  state={allState(permissions, level)}
                  label={`${allAreas}: ${column(level)}`}
                  disabled={disabled}
                  onChange={(ticked) => onRequest(changesForAll(permissions, level, ticked), null)}
                />
              </td>
            ))}
          </tr>
          {permissions.map((permission) => {
            const name = t(`settings.mcp.areas.${permission.area}.name`);
            return (
              <tr key={permission.area}>
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  <span className="font-medium">{name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {permission.level === 'off' ? t('settings.mcp.noAccess') : t(levelTextKeys(permission.area, permission.level))}
                  </span>
                </th>
                {CHECK_LEVELS.map((level) => (
                  <td key={level} className="px-3 py-2 text-center">
                    {permission.levels.includes(level) ? (
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        aria-label={`${name}: ${column(level)}`}
                        checked={isTicked(permission, level)}
                        disabled={disabled}
                        onChange={(e) => tickArea(permission, level, e.target.checked)}
                      />
                    ) : (
                      <span className="text-muted-foreground" aria-hidden="true">
                        –
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Settings section "MCP (AI assistants)": switches the access of AI assistants on and off, shows the address and the
 * token (once), sets what they may do per area and which family trees they see. Granting "write" or "delete" warns
 * first. The section itself is out of reach of the assistants.
 */
export function McpSection() {
  const { t } = useTranslation();
  const { data, loading } = useQuery<{ mcpSettings: McpSettings }>(MCP_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const { trees } = useFamilyTrees();
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [enable, enabling] = useMutation<{ enableMcp: { token: string } }>(ENABLE_MCP, REFETCH);
  const [disable, disabling] = useMutation(DISABLE_MCP, REFETCH);
  const [renew, renewing] = useMutation<{ renewMcpToken: { token: string } }>(RENEW_MCP_TOKEN, REFETCH);
  const [savePermissions, savingPermissions] = useMutation(SET_MCP_PERMISSIONS, intoSettings('setMcpPermissions'));
  const [saveTrees, savingTrees] = useMutation(SET_MCP_EXCLUDED_TREES, intoSettings('setMcpExcludedTrees'));
  const settings = data?.mcpSettings;
  // The boxes stay usable while a change is saved: they show it at once
  const busy = enabling.loading || disabling.loading || renewing.loading;
  const error = enabling.error ?? disabling.error ?? renewing.error ?? savingPermissions.error ?? savingTrees.error;

  if (!settings) {
    return loading ? <Loader2 className="h-4 w-4 animate-spin" aria-label={t('common.loading')} /> : null;
  }

  const toggle = async (on: boolean) => {
    try {
      if (on) {
        const result = await enable();
        setToken(result.data?.enableMcp.token ?? null);
      } else {
        await disable();
        setToken(null);
      }
    } catch {
      // shown below
    }
  };

  const newToken = async () => {
    try {
      const result = await renew();
      setToken(result.data?.renewMcpToken.token ?? null);
    } catch {
      // shown below
    }
  };

  const save = (changes: PermissionChange[]) => {
    if (!changes.length) {
      return;
    }
    const permissions = settings.permissions.map((p) => ({ ...p, level: changes.find((c) => c.area === p.area)?.level ?? p.level }));
    void savePermissions({
      variables: { permissions: changes.map(({ area, level }) => ({ area, level })) },
      optimisticResponse: { setMcpPermissions: { ...settings, permissions } },
    }).catch(() => undefined);
  };

  const saveExcluded = (ids: string[]) => {
    void saveTrees({ variables: { ids }, optimisticResponse: { setMcpExcludedTrees: { ...settings, excludedTrees: ids } } }).catch(() => undefined);
  };

  /** Saves at once, or after the warning when a level rises to "write" or "delete" */
  const request = (changes: PermissionChange[], area: string | null) => {
    const warning = warningForChanges(changes);
    if (warning) {
      setPending({ changes, warning, area });
    } else {
      save(changes);
    }
  };

  const toggleTree = (id: string, visible: boolean) => {
    saveExcluded(visible ? settings.excludedTrees.filter((tree) => tree !== id) : [...settings.excludedTrees, id]);
  };

  const pendingArea = pending?.area ? t(`settings.mcp.areas.${pending.area}.name`) : t('settings.mcp.allAreas');
  const pendingLevel = pending?.area ? pending.changes[0]?.level : null;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">{t('settings.mcp.intro')}</p>
      <label htmlFor="settings-mcp-enabled" className="flex items-start gap-2">
        <input
          id="settings-mcp-enabled"
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-primary"
          checked={settings.enabled}
          disabled={busy}
          onChange={(e) => void toggle(e.target.checked)}
        />
        <span>
          <span className="font-medium">{t('settings.mcp.enable')}</span>
          <span className="block text-muted-foreground">{t('settings.mcp.privacy')}</span>
        </span>
      </label>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {apiErrorMessage(error, t)}
        </p>
      )}

      {settings.enabled && (
        <>
          <p className="text-sm" data-testid="mcp-summary">
            {t(`settings.mcp.summary.${permissionSummary(settings)}`)}
          </p>
          {settings.portChanged && (
            <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="status">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              {t('settings.mcp.portChanged')}
            </p>
          )}

          <div className="space-y-3 border-t pt-4" role="group" aria-labelledby="settings-mcp-connect">
            <h3 id="settings-mcp-connect" className="font-medium">
              {t('settings.mcp.connect')}
            </h3>
            {settings.address && <CopyField id="settings-mcp-address" label={t('settings.mcp.address')} value={settings.address} />}
            {token ? (
              <>
                <p className="flex items-start gap-2 text-sm" role="status">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {t('settings.mcp.tokenOnce')}
                </p>
                <CopyField id="settings-mcp-token" label={t('settings.mcp.token')} value={token} />
                {settings.address && (
                  <>
                    <CopyField
                      id="settings-mcp-claude-code"
                      label={t('settings.mcp.claudeCode')}
                      value={claudeCodeCommand(settings.address, token)}
                      multiline
                    />
                    <CopyField id="settings-mcp-json" label={t('settings.mcp.json')} value={clientJson(settings.address, token)} multiline />
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('settings.mcp.tokenHidden')}</p>
            )}
            <Button id="settings-mcp-renew" size="sm" variant="outline" disabled={busy} onClick={() => void newToken()}>
              {renewing.loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('settings.mcp.renew')}
            </Button>
          </div>

          <div className="space-y-3 border-t pt-4" role="group" aria-labelledby="settings-mcp-permissions">
            <h3 id="settings-mcp-permissions" className="font-medium">
              {t('settings.mcp.permissions')}
            </h3>
            <p className="text-muted-foreground">{t('settings.mcp.permissionsHint')}</p>
            <PermissionTable permissions={settings.permissions} disabled={busy} onRequest={request} />
          </div>

          {trees.length > 0 && (
            <div className="space-y-2 border-t pt-4" role="group" aria-labelledby="settings-mcp-trees">
              <h3 id="settings-mcp-trees" className="font-medium">
                {t('settings.mcp.trees')}
              </h3>
              <p className="text-muted-foreground">{t('settings.mcp.treesHint')}</p>
              <label className="flex items-center gap-2 border-b pb-2 text-sm font-medium">
                <AllBox
                  state={treesState(trees, settings.excludedTrees)}
                  label={t('settings.mcp.allTrees')}
                  disabled={busy}
                  onChange={(ticked) => saveExcluded(ticked ? [] : trees.map((tree) => tree.id))}
                />
                {t('settings.mcp.allTrees')}
              </label>
              {trees.map((tree) => (
                <label key={tree.id} htmlFor={`settings-mcp-tree-${tree.id}`} className="flex items-center gap-2 text-sm">
                  <input
                    id={`settings-mcp-tree-${tree.id}`}
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={!settings.excludedTrees.includes(tree.id)}
                    disabled={busy}
                    onChange={(e) => toggleTree(tree.id, e.target.checked)}
                  />
                  {tree.name}
                </label>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={!!pending} onClose={() => setPending(null)}>
        {pending && (
          <>
            <DialogHeader>
              <DialogTitle>{t(`settings.mcp.warning.${pending.warning}.title`, { area: pendingArea })}</DialogTitle>
            </DialogHeader>
            <p className="flex items-start gap-2 text-sm">
              <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${pending.warning === 'delete' ? 'text-destructive' : 'text-amber-600'}`} aria-hidden="true" />
              {t(`settings.mcp.warning.${pending.warning}.text`)}
            </p>
            {pending.area && pendingLevel && pendingLevel !== 'off' && (
              <p className="text-sm text-muted-foreground">{t(levelTextKeys(pending.area, pendingLevel))}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPending(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant={pending.warning === 'delete' ? 'destructive' : 'default'}
                onClick={() => {
                  save(pending.changes);
                  setPending(null);
                }}
              >
                {t('settings.mcp.warning.confirm')}
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
}
