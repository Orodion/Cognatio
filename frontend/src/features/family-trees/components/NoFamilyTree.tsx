import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { ArrowDownUp, Library, Plus, Trash2 } from 'lucide-react';
import { GET_DELETED_FAMILY_TREES } from '@/features/family-trees/graphql/familyTreeQueries';
import { useSwitchTree } from '@/features/family-trees/lib/useFamilyTrees';
import { FamilyTreeFormDialog } from '@/features/family-trees/components/FamilyTreeFormDialog';
import { Button } from '@/components/ui/Button';
import { buttonVariants } from '@/components/ui/buttonVariants';

/**
 * Instead of the pages that work in a family tree when there is none (new database, all in the recycle bin):
 * create one, import a file or get one back from the recycle bin.
 */
export function NoFamilyTree() {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const switchTree = useSwitchTree();
  const { data } = useQuery<{ deletedFamilyTrees: Array<{ id: string }> }>(GET_DELETED_FAMILY_TREES);
  const inTrash = data?.deletedFamilyTrees.length ?? 0;

  return (
    <section className="mx-auto max-w-xl space-y-4 rounded-xl border bg-card p-8 text-center shadow-xs" aria-labelledby="no-tree-title">
      <Library className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h1 id="no-tree-title" className="text-xl font-semibold">
        {t('familyTrees.none.title')}
      </h1>
      <p className="text-sm text-muted-foreground">{t('familyTrees.none.text')}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          {t('familyTrees.create')}
        </Button>
        <Link to="/import-export" className={buttonVariants({ variant: 'outline' })}>
          <ArrowDownUp className="h-4 w-4" />
          {t('familyTrees.none.import')}
        </Link>
        {inTrash > 0 && (
          <Link to="/trash" className={buttonVariants({ variant: 'outline' })}>
            <Trash2 className="h-4 w-4" />
            {t('familyTrees.none.trash')}
          </Link>
        )}
      </div>
      <FamilyTreeFormDialog open={creating} tree={null} onClose={() => setCreating(false)} onSaved={(saved) => switchTree(saved.id, { stay: true })} />
    </section>
  );
}
