import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { DELETE_FAMILY_TREE } from '@/features/family-trees/graphql/familyTreeQueries';
import type { FamilyTree } from '@/features/family-trees/types/familyTree';
import { useFamilyTrees, useSwitchTree } from '@/features/family-trees/lib/useFamilyTrees';
import { apiErrorMessage } from '@/lib/apiErrors';
import { formatDate } from '@/lib/formatDate';
import { FamilyTreeFormDialog } from '@/features/family-trees/components/FamilyTreeFormDialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

/** Create, open, rename family trees and move them to the recycle bin */
export function FamilyTreesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { trees, active, loading } = useFamilyTrees();
  const switchTree = useSwitchTree();
  // null = closed, 'new' = new family tree, otherwise the one being edited
  const [editing, setEditing] = useState<FamilyTree | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Also update the number at the recycle bin in the sidebar
  const [deleteTree] = useMutation(DELETE_FAMILY_TREE, { refetchQueries: ['GetFamilyTrees', 'GetDeletedFamilyTrees'] });

  const open = async (tree: FamilyTree) => {
    await switchTree(tree.id, { stay: true });
    navigate('/');
  };

  const handleDelete = async (tree: FamilyTree) => {
    if (!window.confirm(t('familyTrees.deleteConfirm', { name: tree.name, count: tree.personCount }))) {
      return;
    }
    setError(null);
    setBusyId(tree.id);
    try {
      // Leave the active one first – otherwise the pages would work in a family tree in the recycle bin;
      // without another one the app works without family tree
      if (tree.id === active?.id) {
        await switchTree(trees.find((x) => x.id !== tree.id)?.id ?? null, { stay: true });
      }
      await deleteTree({ variables: { id: tree.id } });
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('familyTrees.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('familyTrees.subtitle')}</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          {t('familyTrees.create')}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('common.loading')}
        </div>
      ) : trees.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">{t('familyTrees.none.text')}</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {trees.map((tree) => {
            const isActive = tree.id === active?.id;
            const busy = busyId === tree.id;
            return (
              <li
                key={tree.id}
                aria-label={tree.name}
                className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs"
                aria-current={isActive ? 'true' : undefined}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{tree.name}</h2>
                  {isActive && <Badge>{t('familyTrees.activeBadge')}</Badge>}
                </div>
                {tree.description && <p className="whitespace-pre-line text-sm">{tree.description}</p>}
                <p className="text-sm text-muted-foreground">
                  {t('familyTrees.persons', { count: tree.personCount })} · {t('familyTrees.createdAt', { date: formatDate(tree.createdAt, i18n.language) })}
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  {!isActive && (
                    <Button size="sm" onClick={() => open(tree)} disabled={busy}>
                      <FolderOpen className="h-4 w-4" />
                      {t('familyTrees.open')}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setEditing(tree)} disabled={busy}>
                    <Pencil className="h-4 w-4" />
                    {t('familyTrees.rename')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(tree)}
                    disabled={busy}
                    aria-label={t('familyTrees.deleteLabel', { name: tree.name })}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {t('common.delete')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm text-muted-foreground">
        {t('familyTrees.trashHint')}{' '}
        <Link to="/trash" className="font-medium text-primary hover:underline">
          {t('trash.title')}
        </Link>
      </p>

      <FamilyTreeFormDialog
        open={editing !== null}
        tree={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        // A new family tree is opened right away – you want to fill it after all
        onSaved={(saved) => {
          if (editing === 'new') {
            switchTree(saved.id, { stay: true });
          }
        }}
      />
    </div>
  );
}
