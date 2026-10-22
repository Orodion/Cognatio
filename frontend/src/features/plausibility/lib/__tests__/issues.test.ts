import { describe, it, expect } from 'vitest';
import { GraphQLError } from 'graphql';
import { LOCALES } from '@/i18n/locales';
import i18next from 'i18next';
import { ISSUE_GROUPS, implausibleIssues, issueText } from '../issues';

/** Kinds that give an age – with a sentence of its own for a range of possible ages */
const AGE_CODES = ['PARENT_TOO_YOUNG', 'MOTHER_TOO_OLD', 'LIFESPAN_TOO_LONG', 'LIVING_TOO_OLD'];

describe('possible errors', () => {
  it('has a group and a sentence in every language for each kind', () => {
    const codes = Object.values(ISSUE_GROUPS).flat();
    expect(new Set(codes).size).toBe(16);
    for (const [language, messages] of Object.entries(LOCALES)) {
      const texts = (messages.plausibility as { issues: Record<string, string> }).issues;
      const ranges = AGE_CODES.map((code) => `${code}_inexact`);
      expect([language, Object.keys(texts).sort()]).toEqual([language, [...codes, ...ranges].sort()]);
    }
  });

  it('says "at least" or "at most" when the dates leave a range of ages', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({ lng: 'en', resources: { en: { translation: LOCALES.en } } });
    expect(issueText({ code: 'LIVING_TOO_OLD', age: 126, inexact: false }, ['Otto'], i18n.t)).toBe(
      'Otto would be 126 years old today – is the date of death missing?',
    );
    expect(issueText({ code: 'LIVING_TOO_OLD', age: 120, inexact: true }, ['Otto'], i18n.t)).toBe(
      'Otto would be at least 120 years old today – is the date of death missing?',
    );
    expect(issueText({ code: 'PARENT_TOO_YOUNG', age: 14, inexact: true }, ['Eva', 'Karl'], i18n.t)).toBe('Eva was at most 14 years old at the birth of Karl.');
  });

  it('reads the issues of a relation the server refused as implausible, and nothing else', () => {
    const issues = [{ code: 'ROLE_GENDER', personIds: ['a', 'b'] }];
    expect(implausibleIssues({ graphQLErrors: [new GraphQLError('x', { extensions: { reason: 'IMPLAUSIBLE', issues } })] })).toEqual(issues);
    expect(implausibleIssues({ graphQLErrors: [new GraphQLError('x', { extensions: { reason: 'DUPLICATE' } })] })).toBeNull();
  });
});
