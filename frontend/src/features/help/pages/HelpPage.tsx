import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { filterHelp, hasHelpFor, helpContent, type HelpBlock } from '@/features/help';
import { VersionHistory } from './VersionHistory';

const headingId = (id: string) => `help-${id}`;

/** Scroll the section heading into view and focus it (screen readers continue reading there) */
function jumpTo(id: string) {
  const heading = document.getElementById(headingId(id));
  if (!heading) {
    return;
  }
  heading.scrollIntoView?.({ block: 'start' });
  heading.focus({ preventScroll: true });
}

function Block({ block }: { block: HelpBlock }) {
  if ('p' in block) {
    return <p>{block.p}</p>;
  }
  if ('steps' in block) {
    return (
      <ol className="list-decimal space-y-1 pl-5">
        {block.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    );
  }
  if ('list' in block) {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {block.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <dl className="space-y-3">
      {block.faq.map(({ q, a }) => (
        <div key={q}>
          <dt className="font-medium">{q}</dt>
          <dd className="text-muted-foreground">{a}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Short help for all areas. The ? button in the header opens it at the section of the current page
 * (/help#section); the search field filters the sections.
 */
export function HelpPage() {
  const { t, i18n } = useTranslation();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const sections = helpContent(i18n.language);
  const shown = filterHelp(sections, query);

  // Jump to the section from the address – also when the ? button is chosen again on the help page
  useEffect(() => {
    if (hash) {
      jumpTo(decodeURIComponent(hash.slice(1)));
    }
  }, [hash]);

  const open = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      setQuery('');
      navigate({ hash: id }, { replace: true });
      // After resetting the search the section is certain to exist
      requestAnimationFrame(() => jumpTo(id));
    },
    [navigate],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('help.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('help.subtitle')}</p>
        {!hasHelpFor(i18n.language) && <p className="mt-2 text-sm">{t('help.notTranslated')}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label={t('help.contents')} className="self-start lg:sticky lg:top-0">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{t('help.contents')}</h2>
          <ul className="space-y-1 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} onClick={open(section.id)} className="block rounded-md px-2 py-1 hover:bg-accent hover:text-accent-foreground">
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('help.search')}
              aria-label={t('help.search')}
              className="pl-10"
            />
          </div>
          <p className="sr-only" role="status">
            {query.trim() ? t('help.results', { count: shown.length }) : ''}
          </p>
          {shown.length === 0 && <p className="text-sm text-muted-foreground">{t('help.noResults')}</p>}

          {shown.map((section) => (
            <section
              key={section.id}
              aria-labelledby={headingId(section.id)}
              className="space-y-3 rounded-xl border bg-card p-5 text-sm leading-relaxed shadow-xs"
            >
              <h2 id={headingId(section.id)} tabIndex={-1} className="scroll-mt-4 text-lg font-semibold outline-hidden">
                {section.title}
              </h2>
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
              {section.id === 'versions' && <VersionHistory open={open} />}
              {section.link && (
                <Link to={section.link.to} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  {section.link.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
