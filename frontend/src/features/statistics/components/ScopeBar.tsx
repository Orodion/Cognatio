import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import type { Person } from '@/features/persons/types/person';
import { PersonChooser } from './PersonChooser';
import { SCOPE_KINDS, WHOLE_TREE, isWholeTree, type ScopeKind, type StatisticsScope } from '../lib/scope';

interface ScopeBarProps {
  scope: StatisticsScope;
  /** The person the scope starts from, once loaded */
  person: Person | null;
  onChange: (scope: StatisticsScope) => void;
}

const yearOf = (value: string) => (/^-?\d{1,4}$/.test(value.trim()) ? Number(value) : undefined);

/**
 * The part of the family tree the statistics look at: everybody, the ancestors or descendants of a person, a last name –
 * each optionally narrowed to years of birth. Typed values apply with Enter or when the field is left. A kind that still
 * needs its person or name is only shown here until it is complete. The parent gives it a new `key` with every scope.
 */
export function ScopeBar({ scope, person, onChange }: ScopeBarProps) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ScopeKind>(scope.kind);
  const [picking, setPicking] = useState(false);
  const [surname, setSurname] = useState(scope.surname ?? '');
  const [from, setFrom] = useState(scope.bornFrom?.toString() ?? '');
  const [to, setTo] = useState(scope.bornTo?.toString() ?? '');
  const needsPerson = kind === 'ancestors' || kind === 'descendants';

  const apply = (event?: FormEvent) => {
    event?.preventDefault();
    const name = surname.trim();
    const years = { bornFrom: yearOf(from), bornTo: yearOf(to) };
    if (kind === 'surname' && name) {
      if (scope.kind !== 'surname' || name !== scope.surname || years.bornFrom !== scope.bornFrom || years.bornTo !== scope.bornTo) {
        onChange({ kind, surname: name, ...years });
      }
    } else if (kind === 'surname' && scope.kind !== 'surname') {
      // The new kind still waits for its name: the years apply together with it (applying them now would show the
      // statistics again with the old kind and drop the one just chosen)
    } else if (years.bornFrom !== scope.bornFrom || years.bornTo !== scope.bornTo) {
      onChange({ ...scope, ...years });
    }
  };

  const changeKind = (next: ScopeKind) => {
    setKind(next);
    const years = { bornFrom: scope.bornFrom, bornTo: scope.bornTo };
    if (next === 'ancestors' || next === 'descendants') {
      // The person stays when switching between ancestors and descendants; without one the choice opens
      if (scope.personId) {
        onChange({ kind: next, personId: scope.personId, ...years });
      } else {
        setPicking(true);
      }
    } else if (next === 'surname') {
      if (surname.trim()) {
        onChange({ kind: next, surname: surname.trim(), ...years });
      }
    } else {
      onChange({ kind: next, ...years });
    }
  };

  const closePicker = () => {
    setPicking(false);
    // Nobody chosen: back to what the statistics show
    if (!scope.personId) {
      setKind(scope.kind);
    }
  };

  return (
    <>
      <form onSubmit={apply} className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4" aria-label={t('statistics.scope.label')}>
        <div className="space-y-1.5">
          <Label htmlFor="statistics-scope">{t('statistics.scope.label')}</Label>
          <Select id="statistics-scope" value={kind} onChange={(e) => changeKind(e.target.value as ScopeKind)} className="w-56">
            {SCOPE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`statistics.scope.kind.${kind}`)}
              </option>
            ))}
          </Select>
        </div>
        {needsPerson && (
          <div className="space-y-1.5">
            <span className="text-sm font-medium leading-none">{t('statistics.scope.person')}</span>
            <Button type="button" variant="outline" onClick={() => setPicking(true)} className="max-w-72">
              <UserRound className="h-4 w-4" />
              <span className="truncate">{person ? formatPersonName(person) : t('statistics.scope.choosePerson')}</span>
            </Button>
          </div>
        )}
        {kind === 'surname' && (
          <div className="space-y-1.5">
            <Label htmlFor="statistics-surname">{t('statistics.scope.surname')}</Label>
            <Input
              id="statistics-surname"
              autoFocus={scope.kind !== 'surname'}
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              onBlur={() => apply()}
              className="w-48"
            />
          </div>
        )}
        <div role="group" aria-labelledby="statistics-born" className="space-y-1.5">
          <span id="statistics-born" className="text-sm font-medium leading-none">
            {t('statistics.scope.born.label')}
          </span>
          <div className="flex items-center gap-2">
            <Label htmlFor="statistics-from" className="sr-only">
              {t('statistics.scope.born.fromLabel')}
            </Label>
            <Input
              id="statistics-from"
              inputMode="numeric"
              placeholder={t('statistics.scope.born.fromLabel')}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onBlur={() => apply()}
              className="w-24"
            />
            <span className="text-muted-foreground">–</span>
            <Label htmlFor="statistics-to" className="sr-only">
              {t('statistics.scope.born.toLabel')}
            </Label>
            <Input
              id="statistics-to"
              inputMode="numeric"
              placeholder={t('statistics.scope.born.toLabel')}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onBlur={() => apply()}
              className="w-24"
            />
          </div>
        </div>
        {/* Enter in a field applies the form */}
        <button type="submit" className="sr-only" tabIndex={-1}>
          {t('statistics.scope.apply')}
        </button>
        {!isWholeTree(scope) && (
          <Button type="button" variant="ghost" onClick={() => onChange(WHOLE_TREE)}>
            <RotateCcw className="h-4 w-4" />
            {t('statistics.scope.reset')}
          </Button>
        )}
      </form>
      <PersonChooser
        id="statistics-person"
        open={picking}
        value={scope.personId ?? ''}
        onClose={closePicker}
        onChoose={(personId) => {
          setPicking(false);
          onChange({ kind: needsPerson ? kind : 'ancestors', personId, bornFrom: scope.bornFrom, bornTo: scope.bornTo });
        }}
      />
    </>
  );
}
