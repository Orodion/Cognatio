import { describe, it, expect, vi, afterEach } from 'vitest';
import { coversText, exportFontCss, parseUnicodeRange, selectFontFaces, type FontFace } from '../exportFonts';

afterEach(() => {
  vi.restoreAllMocks();
  document.head.innerHTML = '';
});

describe('parseUnicodeRange', () => {
  it('reads single code points, ranges and wildcards', () => {
    expect(parseUnicodeRange('U+0000-00FF, U+0131, u+4??')).toEqual([
      [0x0, 0xff],
      [0x131, 0x131],
      [0x400, 0x4ff],
    ]);
  });

  it('ignores empty or invalid parts', () => {
    expect(parseUnicodeRange(' , U+zz, U+20')).toEqual([[0x20, 0x20]]);
  });
});

describe('coversText', () => {
  const latin = 'U+0000-00FF, U+0131';
  const cyrillic = 'U+0301, U+0400-045F';

  it('matches when at least one character is in the range', () => {
    expect(coversText(latin, 'Müller')).toBe(true);
    expect(coversText(cyrillic, 'Müller')).toBe(false);
    expect(coversText(cyrillic, 'Иван Müller')).toBe(true);
  });

  it('ignores whitespace and treats a missing range as covering everything', () => {
    expect(coversText(cyrillic, ' \n ')).toBe(false);
    expect(coversText('', 'x')).toBe(true);
  });
});

describe('selectFontFaces', () => {
  const face = (family: string, unicodeRange: string, url: string | null = '/f.woff2'): FontFace => ({ cssText: '', family, unicodeRange, url });

  it('keeps only faces of the family that are needed for the text', () => {
    const faces = [
      face('"Inter Variable"', 'U+0000-00FF'),
      face('"Inter Variable"', 'U+0400-045F'),
      face('Other', 'U+0000-00FF'),
      face("'Inter Variable'", 'U+0000-00FF', null),
    ];
    expect(selectFontFaces(faces, 'Inter Variable', 'Anna')).toEqual([faces[0]]);
  });
});

describe('exportFontCss', () => {
  const addFonts = () => {
    const style = document.createElement('style');
    style.textContent = `
      @font-face { font-family: "Inter Variable"; src: url(/fonts/inter-latin.woff2) format("woff2"); unicode-range: U+0000-00FF; }
      @font-face { font-family: "Inter Variable"; src: url(/fonts/inter-cyrillic.woff2) format("woff2"); unicode-range: U+0400-045F; }`;
    document.head.appendChild(style);
  };

  it('embeds only the needed font files as data URLs', async () => {
    addFonts();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'font/woff2' } }));

    const css = await exportFontCss('Anna Muster');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/fonts\/inter-latin\.woff2$/);
    // [1, 2, 3] als Base64
    expect(css).toContain('url("data:font/woff2;base64,AQID")');
    expect(css).not.toContain('inter-cyrillic');
  });

  it('returns nothing if no font is needed or the file cannot be loaded', async () => {
    addFonts();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));
    expect(await exportFontCss('中文')).toBeUndefined();
    expect(await exportFontCss('Иван')).toBeUndefined();
  });
});
