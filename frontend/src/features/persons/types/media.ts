import { apiUrl } from '@/lib/platform';
import { useActiveTreeStore } from '@/stores/activeTreeStore';

export interface Media {
  id: string;
  /** Person the file belongs to */
  personId?: string | null;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  type: 'PROFILE_PICTURE' | 'DOCUMENT' | 'PHOTO' | 'OTHER';
  createdAt: string;
  updatedAt: string;
  /** Owner – for linked media of other persons, for the hint "from …" */
  person?: { id: string; firstName: string; lastName?: string | null } | null;
  /** Events the file is linked with */
  events?: Array<{ id: string; title: string; personId: string }>;
}

export const mediaUrl = (media: Pick<Media, 'fileName'>) => apiUrl(`/uploads/${encodeURIComponent(media.fileName)}`);
/** Download under the original file name; a link sends no header, so the family tree goes along as parameter */
export const mediaDownloadUrl = (media: Pick<Media, 'id'>) => {
  const { treeId } = useActiveTreeStore.getState();
  const query = treeId ? `?familyTree=${encodeURIComponent(treeId)}` : '';
  return apiUrl(`/api/v1/media/${encodeURIComponent(media.id)}/download${query}`);
};
export const isImage = (media: Pick<Media, 'mimeType'>) => media.mimeType.startsWith('image/');
