/** Separately managed family tree; all other data belongs to exactly one */
export interface FamilyTree {
  id: string;
  name: string;
  description?: string | null;
  /** Persons without the recycle bin */
  personCount: number;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
