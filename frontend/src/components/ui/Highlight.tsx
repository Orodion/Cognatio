import { highlightRanges } from '@/lib/textFilter';

/** The text with the words of the filter marked */
export function Highlight({ text, query }: { text: string; query?: string }) {
  const ranges = query ? highlightRanges(text, query) : [];
  if (ranges.length === 0) {
    return <>{text}</>;
  }
  const pieces: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach(([start, end], i) => {
    if (start > at) {
      pieces.push(text.slice(at, start));
    }
    pieces.push(
      <mark key={i} className="rounded-xs bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-500/40">
        {text.slice(start, end)}
      </mark>,
    );
    at = end;
  });
  if (at < text.length) {
    pieces.push(text.slice(at));
  }
  return <>{pieces}</>;
}
