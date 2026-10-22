import { parentChildOf } from '../../resolvers/relationResolvers.js';

interface CycleRelation {
  personAId: string;
  personBId: string;
  type: string;
  active?: boolean;
}

/**
 * Groups of persons that are their own ancestors via active parent-child relations (strongly connected
 * components of the parent → child graph). The app prevents this when relations are entered, but an import
 * file or a backup can contain it. The tree and the statistics cope with it, so it is only reported.
 */
export function ancestorCycles(relations: CycleRelation[]): string[][] {
  const childrenOf = new Map<string, string[]>();
  for (const rel of relations) {
    const pc = rel.active === false ? null : parentChildOf(rel);
    if (pc) {
      childrenOf.set(pc.parentId, [...(childrenOf.get(pc.parentId) ?? []), pc.childId]);
    }
  }

  // Tarjan's algorithm without recursion – deep family lines must not overflow the stack
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  let counter = 0;

  for (const root of childrenOf.keys()) {
    if (index.has(root)) {
      continue;
    }
    const work: Array<{ id: string; next: number }> = [{ id: root, next: 0 }];
    index.set(root, counter);
    low.set(root, counter++);
    stack.push(root);
    onStack.add(root);
    while (work.length) {
      const frame = work[work.length - 1];
      const children = childrenOf.get(frame.id) ?? [];
      if (frame.next < children.length) {
        const child = children[frame.next++];
        if (!index.has(child)) {
          index.set(child, counter);
          low.set(child, counter++);
          stack.push(child);
          onStack.add(child);
          work.push({ id: child, next: 0 });
        } else if (onStack.has(child)) {
          low.set(frame.id, Math.min(low.get(frame.id)!, index.get(child)!));
        }
        continue;
      }
      work.pop();
      if (work.length) {
        const parent = work[work.length - 1].id;
        low.set(parent, Math.min(low.get(parent)!, low.get(frame.id)!));
      }
      if (low.get(frame.id) === index.get(frame.id)) {
        const component: string[] = [];
        let member: string;
        do {
          member = stack.pop()!;
          onStack.delete(member);
          component.push(member);
        } while (member !== frame.id);
        if (component.length > 1) {
          cycles.push(component.reverse());
        }
      }
    }
  }
  return cycles;
}
