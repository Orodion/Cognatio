import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { CitationDraft } from '@/features/sources/lib/citationDraft';
import { MAX_LONG_LENGTH, MAX_SHORT_LENGTH, QUALITY_LEVELS } from '@/features/sources/types/source';
import { DateInput } from '@/components/ui/DateInput';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

/** Page, date, quality, transcription and note of a citation */
export function CitationFields({ draft, onChange }: { draft: CitationDraft; onChange: (draft: CitationDraft) => void }) {
  const { t } = useTranslation();
  const id = useId();
  const set = (field: keyof CitationDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onChange({ ...draft, [field]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-page`}>{t('sources.citation.page')}</Label>
          <Input id={`${id}-page`} value={draft.page} onChange={set('page')} maxLength={MAX_SHORT_LENGTH} placeholder={t('sources.citation.pagePlaceholder')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-date`}>{t('sources.citation.date')}</Label>
          <DateInput id={`${id}-date`} value={draft.date} onChange={(date) => onChange({ ...draft, date })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-quality`}>{t('sources.citation.quality')}</Label>
        <Select id={`${id}-quality`} value={draft.quality} onChange={set('quality')} aria-describedby={`${id}-quality-hint`}>
          <option value="">{t('sources.quality.none')}</option>
          {QUALITY_LEVELS.map((level) => (
            <option key={level} value={String(level)}>
              {t(`sources.quality.${level}`)}
            </option>
          ))}
        </Select>
        <p id={`${id}-quality-hint`} className="text-xs text-muted-foreground">
          {t('sources.quality.hint')}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-text`}>{t('sources.citation.text')}</Label>
        <Textarea
          id={`${id}-text`}
          value={draft.text}
          onChange={set('text')}
          maxLength={MAX_LONG_LENGTH}
          rows={4}
          placeholder={t('sources.citation.textPlaceholder')}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-note`}>{t('sources.citation.note')}</Label>
        <Textarea id={`${id}-note`} value={draft.note} onChange={set('note')} maxLength={MAX_LONG_LENGTH} rows={2} />
      </div>
    </div>
  );
}
