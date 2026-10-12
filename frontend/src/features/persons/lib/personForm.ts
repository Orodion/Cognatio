import type { PersonInput } from '@/features/persons/types/person';

/** Choices for the gender of a person */
export const GENDER_OPTIONS = ['MALE', 'FEMALE', 'UNKNOWN'] as const;

/** Empty form for creating a person */
export const emptyPersonForm: PersonInput = {
  firstName: '',
  lastName: '',
  middleName: '',
  birthName: '',
  title: '',
  nickname: '',
  birthDate: '',
  birthPlace: '',
  gender: 'UNKNOWN',
  deathDate: '',
  deathPlace: '',
  address: '',
  phone: '',
  email: '',
  occupation: '',
  hobbies: '',
  maritalStatus: 'SINGLE',
  nationality: '',
  languages: [],
};

/** Form values for the backend: empty texts become null */
export function formToInput(form: PersonInput): PersonInput {
  // Convert empty strings to null-ish values the backend expects
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(form)) {
    if (key === 'languages') {
      cleaned[key] = value;
    } else if (typeof value === 'string' && value.trim() === '') {
      cleaned[key] = null;
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as PersonInput;
}
