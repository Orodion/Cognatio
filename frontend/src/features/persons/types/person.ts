export interface Person {
  id: string;
  firstName: string;
  lastName?: string | null;
  middleName?: string | null;
  birthName?: string | null;
  title?: string | null;
  nickname?: string | null;
  birthDate?: string | null;
  birthDatePrecision?: string | null;
  birthPlace?: string | null;
  gender: string;
  deathDate?: string | null;
  deathDatePrecision?: string | null;
  deathPlace?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  occupation?: string | null;
  hobbies?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  languages: string[];
  profilePictureId?: string | null;
  /** URL of the profile picture resolved by the backend (read-only) */
  profilePictureUrl?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PersonInput = Partial<Omit<Person, 'id' | 'isDeleted' | 'deletedAt' | 'createdAt' | 'updatedAt'>> & {
  firstName: string;
};

/** Where a person was found in a search */
export type SearchMatch = 'NAME' | 'PHONETIC' | 'DETAILS' | 'EVENT' | 'NOTE';

export interface SearchResult {
  person: Person;
  matchedIn: SearchMatch[];
}
