import type { TFunction } from 'i18next';

/**
 * The part of the family tree the statistics look at, kept in the URL (`?scope=ancestors&person=…&from=1800&to=1900`) so
 * a link or the back button restores it. The person list takes the same parameters together with `filter`.
 */
export const SCOPE_KINDS = ['all', 'ancestors', 'descendants', 'surname'] as const;
export type ScopeKind = (typeof SCOPE_KINDS)[number];

export interface StatisticsScope {
  kind: ScopeKind;
  personId?: string;
  surname?: string;
  bornFrom?: number;
  bornTo?: number;
}

export const WHOLE_TREE: StatisticsScope = { kind: 'all' };

/** The URL parameters of a scope */
export const SCOPE_PARAMS = ['scope', 'person', 'surname', 'from', 'to'] as const;

const year = (value: string | null) => (value && /^-?\d{1,4}$/.test(value.trim()) ? Number(value) : undefined);

/** The scope of the URL; anything incomplete counts as the whole family tree */
export function readScope(params: URLSearchParams): StatisticsScope {
  const kind = params.get('scope') as ScopeKind | null;
  const range = { bornFrom: year(params.get('from')), bornTo: year(params.get('to')) };
  const personId = params.get('person')?.trim();
  const surname = params.get('surname')?.trim();
  if ((kind === 'ancestors' || kind === 'descendants') && personId) {
    return { kind, personId, ...range };
  }
  if (kind === 'surname' && surname) {
    return { kind, surname, ...range };
  }
  return { kind: 'all', ...range };
}

/** The URL parameters of a scope (the whole family tree without years has none) */
export function scopeSearch(scope: StatisticsScope): URLSearchParams {
  const params = new URLSearchParams();
  if (scope.kind === 'ancestors' || scope.kind === 'descendants') {
    params.set('scope', scope.kind);
    params.set('person', scope.personId ?? '');
  } else if (scope.kind === 'surname') {
    params.set('scope', scope.kind);
    params.set('surname', scope.surname ?? '');
  }
  if (scope.bornFrom !== undefined) {
    params.set('from', String(scope.bornFrom));
  }
  if (scope.bornTo !== undefined) {
    params.set('to', String(scope.bornTo));
  }
  return params;
}

export const isWholeTree = (scope: StatisticsScope) => scope.kind === 'all' && scope.bornFrom === undefined && scope.bornTo === undefined;

/** The scope as the API takes it; null for the whole family tree */
export function scopeVariables(scope: StatisticsScope) {
  if (isWholeTree(scope)) {
    return null;
  }
  return {
    kind: scope.kind.toUpperCase(),
    personId: scope.personId ?? null,
    surname: scope.surname ?? null,
    bornFrom: scope.bornFrom ?? null,
    bornTo: scope.bornTo ?? null,
  };
}

/** The person list with the persons behind a figure of the statistics */
export function filterLink(filter: string, scope: StatisticsScope): string {
  const params = new URLSearchParams({ filter });
  scopeSearch(scope).forEach((value, key) => params.set(key, value));
  return `/persons?${params}`;
}

/** The statistics page with a scope (and tab) */
export function statisticsLink(scope: StatisticsScope, tab?: string): string {
  const params = scopeSearch(scope);
  if (tab) {
    params.set('tab', tab);
  }
  const search = params.toString();
  return search ? `/statistics?${search}` : '/statistics';
}

/** The person an ancestor filter (`ancestors:<person>:<generation>`, `openEnds:…`) starts from */
export function filterPersonId(filter: string): string | undefined {
  return /^(?:ancestors|openEnds):(.+):\d+$/.exec(filter)?.[1];
}

/** What a filter of the statistics stands for, e.g. "Last name: Kraft"; `personName` for an ancestor filter */
export function filterLabel(filter: string, t: TFunction, personName?: string): string {
  const colon = filter.indexOf(':');
  const kind = colon < 0 ? filter : filter.slice(0, colon);
  const value = colon < 0 ? '' : filter.slice(colon + 1);
  switch (kind) {
    case 'gender':
      return t('statistics.filter.gender', { gender: t(`gender.${value.toUpperCase()}`) });
    case 'livingAge':
    case 'deathAge': {
      const from = Number(value);
      const ages = from >= 100 ? t('statistics.ages.plus', { from }) : t('statistics.ages.range', { from, to: from + 9 });
      return t(`statistics.filter.${kind}`, { ages });
    }
    case 'surname':
    case 'birthplace':
    case 'generation':
      return t(`statistics.filter.${kind}`, { value });
    case 'bornDecade':
    case 'diedDecade':
    case 'marriedDecade':
      return t(`statistics.filter.${kind}`, { decades: `${value}–${Number(value) + 9}` });
    case 'lives': {
      const [measure, century, gender] = value.split(':');
      const centuries = century === 'all' ? t('statistics.lives.allCenturies') : `${century}–${Number(century) + 99}`;
      return t('statistics.filter.lives', {
        measure: t(`statistics.lives.measures.${measure}`),
        gender: t(`statistics.lives.genders.${gender}`),
        centuries,
      });
    }
    case 'children':
      return t('statistics.filter.children', { number: Number(value) >= 10 ? '10+' : value });
    case 'ageGap':
      return t('statistics.filter.ageGap', { gap: t(`statistics.lives.ageGap.${value}`) });
    case 'firstName': {
      const [gender, century, ...name] = value.split(':');
      const centuries = century === 'all' ? '' : `, ${century}–${Number(century) + 99}`;
      return t('statistics.filter.firstName', { name: name.join(':'), gender: t(`statistics.lives.genders.${gender}`), centuries });
    }
    case 'stayed':
      return t(`statistics.filter.stayed.${value === 'yes' ? 'yes' : 'no'}`);
    case 'move': {
      const [from, to] = value.split('|');
      return t('statistics.filter.move', { from, to });
    }
    case 'place':
      return t('statistics.filter.place', { value });
    case 'missing':
      return t('statistics.filter.missing', { fact: t(`statistics.completeness.facts.${value}`) });
    case 'ancestors':
    case 'openEnds':
      return t(`statistics.filter.${kind}`, { name: personName ?? '…', generation: value.slice(value.lastIndexOf(':') + 1) });
    default:
      return t(`statistics.filter.${kind}`, { defaultValue: filter });
  }
}

/** What a scope covers, e.g. "Ancestors of Anna Kraft · born 1800–1900"; `personName` for a scope from a person */
export function scopeLabel(scope: StatisticsScope, personName: string | undefined, t: TFunction): string {
  const parts: string[] = [];
  if (scope.kind === 'ancestors' || scope.kind === 'descendants') {
    parts.push(t(`statistics.scope.of.${scope.kind}`, { name: personName ?? '…' }));
  } else if (scope.kind === 'surname') {
    parts.push(t('statistics.scope.of.surname', { name: scope.surname }));
  }
  if (scope.bornFrom !== undefined && scope.bornTo !== undefined) {
    parts.push(t('statistics.scope.born.range', { from: scope.bornFrom, to: scope.bornTo }));
  } else if (scope.bornFrom !== undefined) {
    parts.push(t('statistics.scope.born.from', { from: scope.bornFrom }));
  } else if (scope.bornTo !== undefined) {
    parts.push(t('statistics.scope.born.to', { to: scope.bornTo }));
  }
  return parts.length ? parts.join(' · ') : t('statistics.scope.of.all');
}
