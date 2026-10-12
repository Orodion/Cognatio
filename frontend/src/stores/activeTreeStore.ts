import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Header with which every request to the backend names its family tree */
export const TREE_HEADER = 'X-Family-Tree-Id';

interface ActiveTreeState {
  /** Family tree the app works in (stored per browser); null until the first choice */
  treeId: string | null;
  setTreeId: (treeId: string | null) => void;
}

export const useActiveTreeStore = create<ActiveTreeState>()(
  persist(
    (set) => ({
      treeId: null,
      setTreeId: (treeId) => set({ treeId }),
    }),
    { name: 'cognatio-active-tree' },
  ),
);

/** Headers for requests outside of Apollo (upload, import/export) */
export function treeHeaders(): Record<string, string> {
  const { treeId } = useActiveTreeStore.getState();
  return treeId ? { [TREE_HEADER]: treeId } : {};
}
