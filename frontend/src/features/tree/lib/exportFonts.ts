/**
 * Font for the family tree export (PNG/SVG/PDF): html-to-image would otherwise embed all @font-face rules
 * of the page – seven character-set parts for Inter. Only the parts whose Unicode range actually occurs
 * in the exported text are embedded here (usually only "latin").
 */

type Range = [number, number];

/** "U+0000-00FF, U+0131, U+4??" → [[0x0, 0xff], [0x131, 0x131], [0x400, 0x4ff]] */
export function parseUnicodeRange(value: string): Range[] {
  return value
    .split(',')
    .map((part) => part.trim().replace(/^U\+/i, ''))
    .filter(Boolean)
    .map((part): Range => {
      if (part.includes('?')) {
        return [parseInt(part.replace(/\?/g, '0'), 16), parseInt(part.replace(/\?/g, 'F'), 16)];
      }
      const [from, to = from] = part.split('-');
      return [parseInt(from, 16), parseInt(to, 16)];
    })
    .filter(([from, to]) => Number.isFinite(from) && Number.isFinite(to));
}

/** Does at least one character of the text fall into the range? Without a range the font applies to all characters. */
export function coversText(unicodeRange: string, text: string) {
  if (!unicodeRange.trim()) {
    return true;
  }
  const ranges = parseUnicodeRange(unicodeRange);
  for (const char of new Set(text.replace(/\s/g, ''))) {
    const code = char.codePointAt(0)!;
    if (ranges.some(([from, to]) => code >= from && code <= to)) {
      return true;
    }
  }
  return false;
}

export interface FontFace {
  cssText: string;
  family: string;
  unicodeRange: string;
  /** Resolved address of the font file */
  url: string | null;
}

/** Fonts of the family that are needed for the text */
export function selectFontFaces(faces: FontFace[], family: string, text: string) {
  return faces.filter((face) => face.family.replace(/["']/g, '').trim() === family && face.url && coversText(face.unicodeRange, text));
}

function readFontFaces(doc: Document): FontFace[] {
  const faces: FontFace[] = [];
  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // foreign stylesheets are not readable
    }
    for (const item of Array.from(rules)) {
      // Type number instead of instanceof: also works where CSSFontFaceRule is missing (jsdom)
      if (item.type !== CSSRule.FONT_FACE_RULE) {
        continue;
      }
      const rule = item as CSSFontFaceRule;
      const src = rule.style.getPropertyValue('src').match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      faces.push({
        cssText: rule.cssText,
        family: rule.style.getPropertyValue('font-family'),
        unicodeRange: rule.style.getPropertyValue('unicode-range'),
        url: src ? new URL(src, sheet.href ?? doc.baseURI).href : null,
      });
    }
  }
  return faces;
}

const dataUrls = new Map<string, Promise<string>>();

/** Base64 in chunks – String.fromCharCode(...bytes) fails for large files because of the argument count */
function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function toDataUrl(url: string) {
  let pending = dataUrls.get(url);
  if (!pending) {
    // Without FileReader: works the same with every fetch (browser, Node)
    pending = fetch(url).then(async (res) => {
      if (!res.ok) {
        throw new Error(`${res.status} ${url}`);
      }
      const type = res.headers.get('Content-Type')?.split(';')[0] || 'font/woff2';
      return `data:${type};base64,${toBase64(new Uint8Array(await res.arrayBuffer()))}`;
    });
    // Do not cache failed requests
    pending.catch(() => dataUrls.delete(url));
    dataUrls.set(url, pending);
  }
  return pending;
}

/**
 * CSS with the embedded font files for `fontEmbedCSS` of html-to-image.
 * Returns `undefined` if nothing can be embedded – the export then uses the fallback font.
 */
export async function exportFontCss(text: string, family = 'Inter Variable', doc: Document = document) {
  const faces = selectFontFaces(readFontFaces(doc), family, text);
  if (!faces.length) {
    return undefined;
  }
  try {
    const embedded = await Promise.all(
      faces.map(async (face) => {
        const dataUrl = await toDataUrl(face.url!);
        return face.cssText.replace(/url\(["']?[^"')]+["']?\)/, `url("${dataUrl}")`);
      }),
    );
    return embedded.join('\n');
  } catch {
    return undefined;
  }
}
