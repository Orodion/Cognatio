import { describe, it, expect } from 'vitest';
import { validatePersonForm } from '../personValidation';

describe('validatePersonForm', () => {
  it('accepts a valid person and returns the parsed dates', () => {
    const { errors, birth, death } = validatePersonForm({
      firstName: 'Anna-Lena',
      lastName: "O'Brien",
      birthDate: 'um 1900',
      deathDate: '12.03.1975',
      email: 'anna@example.com',
      phone: '+49 (30) 123-456',
    });
    expect(errors).toEqual({});
    expect(birth?.precision).toBe('APPROXIMATE');
    expect(death?.precision).toBe('EXACT');
  });

  it('needs no first name when the box "First name unknown" is ticked', () => {
    expect(validatePersonForm({ firstName: '' }, { firstNameUnknown: true }).errors).toEqual({});
    // A leftover text in the disabled field is not checked either
    expect(validatePersonForm({ firstName: '?' }, { firstNameUnknown: true }).errors).toEqual({});
    expect(validatePersonForm({ firstName: '?' }).errors.firstName).toBe('invalidName');
  });

  it('requires a first name and rejects digits in names', () => {
    expect(validatePersonForm({ firstName: '  ' }).errors.firstName).toBe('required');
    expect(validatePersonForm({ firstName: 'Max', lastName: 'M4ier' }).errors.lastName).toBe('invalidName');
  });

  it('checks dates for format and plausibility', () => {
    expect(validatePersonForm({ firstName: 'A', birthDate: '32.01.1980' }).errors.birthDate).toBe('invalidDate');
    expect(validatePersonForm({ firstName: 'A', birthDate: '1980', deathDate: '1970' }).errors.deathDate).toBe('deathBeforeBirth');
    expect(validatePersonForm({ firstName: 'A', birthDate: '1700', deathDate: '1900' }).errors.deathDate).toBe('lifespanTooLong');
    // The same year with different precision is allowed
    expect(validatePersonForm({ firstName: 'A', birthDate: '05.1980', deathDate: '1980' }).errors).toEqual({});
  });

  it('checks email and phone format', () => {
    const { errors } = validatePersonForm({ firstName: 'A', email: 'kein-mail', phone: 'abc' });
    expect(errors.email).toBe('invalidEmail');
    expect(errors.phone).toBe('invalidPhone');
  });
});
