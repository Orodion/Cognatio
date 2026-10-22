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
  /** Start of the ancestor figures, the reports and the family tree page; null without one */
  homePerson?: HomePerson | null;
}

/** The name fields of the home person */
export interface HomePerson {
  id: string;
  title?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  birthName?: string | null;
}
