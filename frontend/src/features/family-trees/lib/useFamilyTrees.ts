import { useCallback, useEffect } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { GET_FAMILY_TREES, SET_HOME_PERSON } from '@/features/family-trees/graphql/familyTreeQueries';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import type { FamilyTree } from '@/features/family-trees/types/familyTree';

/** Oldest family tree – like the backend's family tree when none is chosen */
export const oldest = (trees: FamilyTree[]) => trees.reduce((a, b) => (b.createdAt < a.createdAt ? b : a));

/**
 * Family trees (by name) and the active one. If the stored one does not exist (any more) – first start, deleted
 * or created in another browser –, the oldest becomes active. `none`: there is no family tree at all (new database,
 * all in the recycle bin) – the app then offers to create, import or restore one.
 */
export function useFamilyTrees() {
  const { data, loading, error } = useQuery<{ familyTrees: FamilyTree[] }>(GET_FAMILY_TREES);
  const treeId = useActiveTreeStore((s) => s.treeId);
  const setTreeId = useActiveTreeStore((s) => s.setTreeId);
  const trees = data?.familyTrees;
  const active = trees?.find((t) => t.id === treeId) ?? null;

  useEffect(() => {
    if (trees?.length && !active) {
      setTreeId(oldest(trees).id);
    } else if (trees && !trees.length && treeId) {
      // The last one went to the recycle bin: requests no longer name it
      setTreeId(null);
    }
  }, [trees, active, treeId, setTreeId]);

  return { trees: trees ?? [], active, none: !!trees && !trees.length, loading: loading && !data, error };
}

/**
 * Home person of the open family tree and a way to set it (null removes it). The statistics count the ancestors from it,
 * so they are fetched again. A failure is not thrown but returned as `error`, for the page to show.
 */
export function useHomePerson() {
  const { active } = useFamilyTrees();
  const [mutate, { loading, error }] = useMutation(SET_HOME_PERSON, { refetchQueries: ['GetTreeStatistics'] });
  const setHomePerson = useCallback(
    (personId: string | null) =>
      mutate({ variables: { personId } }).then(
        () => undefined,
        () => undefined,
      ),
    [mutate],
  );
  return { homePerson: active?.homePerson ?? null, setHomePerson, saving: loading, error };
}

/**
 * Switches the active family tree: all queries then load the data of the new one. Pages that refer to a
 * person of the previous one (detail page, focus person in the address) are left.
 */
export function useSwitchTree() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const setTreeId = useActiveTreeStore((s) => s.setTreeId);

  return useCallback(
    // null: leave the family tree without opening another (the last one went to the recycle bin)
    async (id: string | null, options: { stay?: boolean } = {}) => {
      if (id === useActiveTreeStore.getState().treeId) {
        return;
      }
      // Just created (also via import): update the list first – otherwise the family tree would count as
      // not existing and useFamilyTrees would switch right back to the first one
      const known = client.readQuery<{ familyTrees: FamilyTree[] }>({ query: GET_FAMILY_TREES })?.familyTrees ?? [];
      if (id && !known.some((t) => t.id === id)) {
        await client.query({ query: GET_FAMILY_TREES, fetchPolicy: 'network-only' });
      }
      setTreeId(id);
      if (!options.stay) {
        if (/^\/persons\/./.test(pathname)) {
          navigate('/persons');
        } else if (pathname === '/tree') {
          navigate('/tree', { replace: true });
        }
      }
      await client.resetStore();
    },
    [client, navigate, pathname, setTreeId],
  );
}

/**
 * After a restore: the open family tree stays if it exists in the backup,
 * otherwise the oldest is opened (or none, if there is none). Then all queries reload.
 */
export function useReloadAllData() {
  const client = useApolloClient();
  const setTreeId = useActiveTreeStore((s) => s.setTreeId);

  return useCallback(async () => {
    // Do not write to the cache – otherwise the open one would briefly count as not existing
    const { data } = await client.query<{ familyTrees: FamilyTree[] }>({ query: GET_FAMILY_TREES, fetchPolicy: 'no-cache' });
    const trees = data?.familyTrees ?? [];
    if (!trees.some((t) => t.id === useActiveTreeStore.getState().treeId)) {
      // A backup without family tree (or with all in the recycle bin) leaves the app without one
      setTreeId(trees.length ? oldest(trees).id : null);
    }
    await client.resetStore();
  }, [client, setTreeId]);
}
