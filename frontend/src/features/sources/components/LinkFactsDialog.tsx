import { useEffect, useId, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import { PersonPicker } from '@/features/persons/components/PersonPicker';
import { GET_EVENTS } from '@/features/persons/graphql/eventQueries';
import { GET_PERSON_RELATIONS } from '@/features/persons/graphql/relationQueries';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import type { TimelineEvent } from '@/features/persons/types/event';
import type { Person } from '@/features/persons/types/person';
import type { PersonRelationDetail } from '@/features/persons/types/relation';
import { LINK_CITATION, LIBRARY_CHANGED } from '@/features/sources/graphql/sourceQueries';
import { personFacts, type PersonFact } from '@/features/sources/lib/personFacts';
import { sameTarget, targetOfLink, type CitationLink } from '@/features/sources/types/source';
import { apiErrorMessage } from '@/lib/apiErrors';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';

interface LinkFactsDialogProps {
  open: boolean;
  citationId: string;
  /** Facts the citation supports already */
  linked: CitationLink[];
  onClose: () => void;
}

/**
 * Links a citation with facts of persons of the open family tree – one person after the other, e.g. groom, bride,
 * their parents and the witnesses of a marriage entry, with the wedding and the marriage.
 */
export function LinkFactsDialog({ open, citationId, linked, onClose }: LinkFactsDialogProps) {
  const { t } = useTranslation();
  const id = useId();
  const [person, setPerson] = useState<Person | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [link, { loading }] = useMutation(LINK_CITATION, LIBRARY_CHANGED);

  useEffect(() => {
    if (open) {
      setPerson(null);
      setChosen([]);
      setDone([]);
      setError(null);
    }
  }, [open]);

  const { data: events } = useQuery<{ getEvents: TimelineEvent[] }>(GET_EVENTS, { variables: { personId: person?.id }, skip: !person });
  const { data: relations } = useQuery<{ getPersonRelations: PersonRelationDetail[] }>(GET_PERSON_RELATIONS, {
    variables: { personId: person?.id },
    skip: !person,
  });
  const facts: PersonFact[] = person ? personFacts(person, events?.getEvents ?? [], relations?.getPersonRelations ?? [], t) : [];
  const already = (fact: PersonFact) => linked.some((l) => sameTarget(targetOfLink(l), fact.target));

  const submit = async () => {
    const targets = facts.filter((f) => chosen.includes(f.key)).map((f) => f.target);
    if (!person || !targets.length) {
      return;
    }
    setError(null);
    try {
      await link({ variables: { citationId, targets } });
      setDone([...done, formatPersonName(person)]);
      setPerson(null);
      setChosen([]);
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl">
      <DialogHeader>
        <DialogTitle>{t('sources.linkFacts.title')}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">{t('sources.linkFacts.intro')}</p>
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-destructive" role="alert">
            {error}
          </div>
        )}
        {done.length > 0 && (
          <p className="flex items-start gap-2" role="status">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            {t('sources.linkFacts.linked', { names: done.join(', ') })}
          </p>
        )}
        {person ? (
          <fieldset className="space-y-2">
            <legend className="font-medium">{t('sources.linkFacts.factsOf', { name: formatPersonName(person) })}</legend>
            <ul className="space-y-1">
              {facts.map((fact) => {
                const isLinked = already(fact);
                return (
                  <li key={fact.key}>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isLinked || chosen.includes(fact.key)}
                        disabled={isLinked}
                        onChange={(e) => setChosen(e.target.checked ? [...chosen, fact.key] : chosen.filter((k) => k !== fact.key))}
                      />
                      <span className={isLinked ? 'text-muted-foreground' : undefined}>
                        {fact.label}
                        {isLinked && ` – ${t('sources.linkFacts.already')}`}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" onClick={submit} disabled={loading || !chosen.length}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('sources.linkFacts.link', { count: chosen.length })}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPerson(null)}>
                {t('sources.linkFacts.otherPerson')}
              </Button>
            </div>
          </fieldset>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`${id}-person`}>{t('sources.linkFacts.choosePerson')}</Label>
            <PersonPicker
              id={`${id}-person`}
              value=""
              onChange={(_, p) => {
                setPerson(p);
                setChosen([]);
              }}
            />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
