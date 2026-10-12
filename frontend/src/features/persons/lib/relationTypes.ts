/** Relation types – semantics: "the selected person is <type> of the current person". */
export const RELATION_TYPES = ['MOTHER', 'FATHER', 'CHILD', 'SIBLING', 'HUSBAND', 'WIFE', 'LIFE_PARTNER', 'PARTNER', 'OTHER'] as const;

export type RelationType = (typeof RELATION_TYPES)[number];
