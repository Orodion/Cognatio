import type { PersonInput } from '@/features/persons/types/person';
import { dateKey, parseFlexibleDate, type ParsedDate } from '@/lib/dateParsing';

/** Error keys per field; translated via i18n under `form.errors.<key>`. */
export type PersonFormErrors = Partial<Record<keyof PersonInput, string>>;

const MAX_NAME_LENGTH = 100;
const MAX_LIFESPAN_YEARS = 125;
// Buchstaben (inkl. Umlaute/Kyrillisch), Leerzeichen, Bindestrich, Apostroph, Punkt
const NAME_PATTERN = /^[\p{L}\p{M}\s'’.-]+$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[\d\s()/-]{5,}$/;

const NAME_FIELDS = ['firstName', 'lastName', 'middleName', 'birthName'] as const;

/** `firstNameUnknown`: the box "First name unknown" is ticked – the field stays empty and is not required */
export function validatePersonForm(
  form: PersonInput,
  options: { firstNameUnknown?: boolean } = {},
): {
  errors: PersonFormErrors;
  birth: ParsedDate | null;
  death: ParsedDate | null;
} {
  const errors: PersonFormErrors = {};

  if (!options.firstNameUnknown && !form.firstName.trim()) {
    errors.firstName = 'required';
  }
  for (const field of NAME_FIELDS) {
    const value = field === 'firstName' && options.firstNameUnknown ? '' : form[field]?.trim();
    if (!value || errors[field]) {
      continue;
    }
    if (value.length > MAX_NAME_LENGTH) {
      errors[field] = 'tooLong';
    } else if (!NAME_PATTERN.test(value)) {
      errors[field] = 'invalidName';
    }
  }

  const parseDateField = (field: 'birthDate' | 'deathDate'): ParsedDate | null => {
    const value = form[field]?.trim();
    if (!value) {
      return null;
    }
    const result = parseFlexibleDate(value);
    if (!result.ok) {
      errors[field] = result.error === 'INVALID' ? 'invalidDate' : result.error === 'FUTURE' ? 'futureDate' : 'rangeOrder';
      return null;
    }
    return result.value;
  };

  const birth = parseDateField('birthDate');
  const death = parseDateField('deathDate');

  if (birth && death) {
    if (dateKey(death.end, 'end') < dateKey(birth.start, 'start')) {
      errors.deathDate = 'deathBeforeBirth';
    } else if (death.start.year - birth.end.year > MAX_LIFESPAN_YEARS) {
      errors.deathDate = 'lifespanTooLong';
    }
  }

  const email = form.email?.trim();
  if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = 'invalidEmail';
  }

  const phone = form.phone?.trim();
  if (phone && !PHONE_PATTERN.test(phone)) {
    errors.phone = 'invalidPhone';
  }

  return { errors, birth, death };
}
