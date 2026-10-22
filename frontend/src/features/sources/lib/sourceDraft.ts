import { useMutation } from '@apollo/client';
import { CREATE_REPOSITORY, CREATE_SOURCE, LIBRARY_CHANGED, UPDATE_SOURCE } from '@/features/sources/graphql/sourceQueries';
import type { Repository, Source, SourceInput, SourceType } from '@/features/sources/types/source';

/** Value of the archive choice that creates a new archive with the name typed below */
export const NEW_REPOSITORY = '__new__';

export interface SourceDraft {
  type: SourceType;
  title: string;
  author: string;
  publication: string;
  abbreviation: string;
  repositoryId: string;
  newRepositoryName: string;
  callNumber: string;
  text: string;
  note: string;
}

export const draftOf = (source?: Source | null): SourceDraft => ({
  type: source?.type ?? 'CHURCH_BOOK',
  title: source?.title ?? '',
  author: source?.author ?? '',
  publication: source?.publication ?? '',
  abbreviation: source?.abbreviation ?? '',
  // Also an archive in the recycle bin: the link stays until it is changed here
  repositoryId: source?.repositoryId ?? '',
  newRepositoryName: '',
  callNumber: source?.callNumber ?? '',
  text: source?.text ?? '',
  note: source?.note ?? '',
});

const orNull = (value: string) => value.trim() || null;

/**
 * Saves a source from the fields (creates the new archive first if one was typed). Returns the source; throws the error
 * of the API (the caller shows it).
 */
export function useSaveSource() {
  const [createRepository] = useMutation<{ createRepository: Repository }>(CREATE_REPOSITORY, LIBRARY_CHANGED);
  const [createSource] = useMutation<{ createSource: Source }>(CREATE_SOURCE, LIBRARY_CHANGED);
  const [updateSource] = useMutation<{ updateSource: Source }>(UPDATE_SOURCE, LIBRARY_CHANGED);
  return async (draft: SourceDraft, existing?: Source | null): Promise<Source | undefined> => {
    let repositoryId: string | null = draft.repositoryId && draft.repositoryId !== NEW_REPOSITORY ? draft.repositoryId : null;
    if (draft.repositoryId === NEW_REPOSITORY && draft.newRepositoryName.trim()) {
      repositoryId = (await createRepository({ variables: { data: { name: draft.newRepositoryName.trim() } } })).data?.createRepository.id ?? null;
    }
    const data: SourceInput = {
      type: draft.type,
      title: draft.title.trim(),
      author: orNull(draft.author),
      publication: orNull(draft.publication),
      abbreviation: orNull(draft.abbreviation),
      repositoryId,
      callNumber: orNull(draft.callNumber),
      text: orNull(draft.text),
      note: orNull(draft.note),
    };
    return existing
      ? (await updateSource({ variables: { id: existing.id, data } })).data?.updateSource
      : (await createSource({ variables: { data } })).data?.createSource;
  };
}

/** Error key of the fields, or null if they can be saved */
export const sourceDraftError = (draft: SourceDraft) =>
  !draft.title.trim()
    ? 'sources.fields.titleRequired'
    : draft.repositoryId === NEW_REPOSITORY && !draft.newRepositoryName.trim()
      ? 'sources.fields.newRepositoryRequired'
      : null;
