import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronDown, ChevronRight, UserRound, Users, X } from 'lucide-react';
import { formatLifeDates, formatShortName } from '@/features/persons/lib/personUtils';
import { groupLinks, type LinkedFact } from '@/features/sources/lib/citationLinks';
import type { CitationLink } from '@/features/sources/types/source';
import { Badge } from '@/components/ui/Badge';

interface CitationLinkGroupsProps {
  links: CitationLink[];
  /** The open family tree – persons of other family trees are marked */
  activeTreeId?: string;
  /** Removes one link; without it the chips have no "×" */
  onUnlink?: (link: CitationLink, fact: string, name: string) => void;
  /** Persons shown before "Show more" */
  limit?: number;
}

const FACT_ICONS = { PERSON: null, EVENT: CalendarDays, RELATION: Users } as const;

function FactChip({ fact, name, onUnlink }: { fact: LinkedFact; name: string; onUnlink?: CitationLinkGroupsProps['onUnlink'] }) {
  const { t } = useTranslation();
  const Icon = FACT_ICONS[fact.link.kind];
  return (
    <li className={`inline-flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pl-2.5 text-xs ${onUnlink ? 'pr-0.5' : 'pr-2.5'}`}>
      {Icon && <Icon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
      <span>{fact.label}</span>
      {onUnlink && (
        <button
          type="button"
          onClick={() => onUnlink(fact.link, fact.label, name)}
          className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('sources.detail.unlink', { fact: fact.label, name })}
          title={t('sources.detail.unlink', { fact: fact.label, name })}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </li>
  );
}

/** The facts a citation supports, by person: the person (with life years) and its facts as chips */
export function CitationLinkGroups({ links, activeTreeId, onUnlink, limit = 5 }: CitationLinkGroupsProps) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const groups = groupLinks(links, t);
  // One more person than the limit is shown rather than a button for a single one
  const collapsible = groups.length > limit + 1;
  const shown = collapsible && !all ? groups.slice(0, limit) : groups;

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {shown.map((group) => {
          const name = formatShortName(group.person);
          const years = formatLifeDates(group.person);
          return (
            <li key={group.person.id} className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <Link to={`/persons/${group.person.id}`} className="font-medium text-primary hover:underline">
                  {name}
                </Link>
                {years && <span className="text-muted-foreground">({years})</span>}
                {group.person.isDeleted && <Badge variant="outline">{t('sources.detail.inTrash')}</Badge>}
                {group.familyTreeId !== activeTreeId && (
                  <Badge variant="outline" title={t('sources.detail.otherTree', { name: group.familyTreeName })}>
                    {group.familyTreeName}
                  </Badge>
                )}
              </div>
              <ul className="flex flex-wrap gap-1.5 pl-6" aria-label={t('sources.detail.factsOf', { name })}>
                {group.facts.map((fact) => (
                  <FactChip key={fact.key} fact={fact} name={name} onUnlink={onUnlink} />
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      {collapsible && (
        <button type="button" onClick={() => setAll(!all)} className="text-sm font-medium text-primary hover:underline" aria-expanded={all}>
          {all ? t('sources.detail.showLess') : t('sources.detail.showMore', { count: groups.length - limit })}
        </button>
      )}
    </div>
  );
}

/** "Supported facts: n" that opens the facts of a citation by person – for the citations of a person */
export function SupportedFactsToggle({ links, count, activeTreeId }: { links: CitationLink[]; count: number; activeTreeId?: string }) {
  const { t } = useTranslation();
  const id = useId();
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Chevron className="h-3 w-3" aria-hidden />
        {t('sources.citation.supports', { count })}
      </button>
      {open && (
        <div id={id} className="pl-4">
          <CitationLinkGroups links={links} activeTreeId={activeTreeId} />
        </div>
      )}
    </div>
  );
}
