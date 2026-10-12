import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { CREATE_FAMILY_TREE, UPDATE_FAMILY_TREE } from '@/features/family-trees/graphql/familyTreeQueries';
import type { FamilyTree } from '@/features/family-trees/types/familyTree';
import { apiErrorMessage } from '@/lib/apiErrors';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

export const MAX_TREE_NAME = 100;

interface FamilyTreeFormDialogProps {
  open: boolean;
  /** Family tree to edit; without one a new one is created */
  tree?: FamilyTree | null;
  onClose: () => void;
  onSaved: (tree: FamilyTree) => void;
}

/** Create or rename a family tree */
export function FamilyTreeFormDialog({ open, tree, onClose, onSaved }: FamilyTreeFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const refetchQueries = ['GetFamilyTrees'];
  const [createTree, { loading: creating }] = useMutation<{ createFamilyTree: FamilyTree }>(CREATE_FAMILY_TREE, { refetchQueries });
  const [updateTree, { loading: updating }] = useMutation<{ updateFamilyTree: FamilyTree }>(UPDATE_FAMILY_TREE, { refetchQueries });
  const saving = creating || updating;

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(tree?.name ?? '');
    setDescription(tree?.description ?? '');
    setError(null);
  }, [open, tree]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('familyTrees.form.nameRequired'));
      return;
    }
    setError(null);
    const data = { name: name.trim(), description: description.trim() || null };
    try {
      const saved = tree
        ? (await updateTree({ variables: { id: tree.id, data } })).data?.updateFamilyTree
        : (await createTree({ variables: { data } })).data?.createFamilyTree;
      if (saved) {
        onSaved(saved);
      }
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
        <DialogHeader>
          <DialogTitle>{tree ? t('familyTrees.form.editTitle') : t('familyTrees.form.createTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="tree-name">{t('familyTrees.form.name')} *</Label>
            <Input
              id="tree-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_TREE_NAME}
              required
              autoFocus
              placeholder={t('familyTrees.form.namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tree-description">{t('familyTrees.form.description')}</Label>
            <Textarea id="tree-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          {!tree && <p className="text-sm text-muted-foreground">{t('familyTrees.form.createHint')}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tree ? t('common.save') : t('familyTrees.form.create')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
