import { randomUUID } from 'crypto';
import { PARTNER_TYPES, parentChildOf } from '../../resolvers/relationResolvers.js';
import {
  FORMAT_NAME,
  FORMAT_VERSION,
  isUnknownGivenName,
  TransferError,
  UNKNOWN_GIVEN_NAME,
  type TransferCitation,
  type TransferData,
  type TransferMedia,
  type TransferPerson,
  type TransferRelation,
  type TransferRepository,
  type TransferSource,
} from './format.js';
import { EVENT_CATEGORIES } from '../personValues.js';
import { SOURCE_TYPES } from '../sourceValues.js';
import { languageCode } from './languages.js';
import { fromGedcomDate, gedcomDateToIso, isoToGedcomDate, toGedcomDate } from './gedcomDate.js';
import {
  BIRTH_TITLE,
  CHILD_LABELS,
  DEATH_TITLE,
  DEFAULT_IMPORT_LANGUAGE,
  EVENT_TITLE,
  fill,
  MEDIUM_MISSING,
  OCCUPATION_TITLE,
  RESIDENCE_TITLE,
  STANDARD_EVENTS,
  WEDDING_IN,
  type ImportLanguage,
} from './languageTexts.js';

export const GEDCOM_VERSIONS = ['5.5.1', '7.0'] as const;
export type GedcomVersion = (typeof GEDCOM_VERSIONS)[number];

// Custom extensions (GEDCOM allows tags starting with "_"); documented in the header via SCHMA in 7.0
const EXTENSION_TAGS = {
  _HOBBY: 'Hobbies',
  _FAMSTAND: 'Marital status (SINGLE, MARRIED, DIVORCED, WIDOWED, CIVIL_PARTNERSHIP)',
  _LANGUAGE: 'Language spoken (language code)',
  _TYPE: 'Type of partnership (LIFE_PARTNER, PARTNER) or NONE for parents without a partnership',
  _ENDE: 'End of the relation',
  _LABEL: 'Label of the parent-child relation, e.g. adopted child',
  _PRIM: 'Main image of a person (profile picture), value Y',
  _STYPE: 'Kind of a source (CHURCH_BOOK, CIVIL_REGISTER, CENSUS, NEWSPAPER, BOOK, LETTER, GRAVESTONE, WEBSITE, INTERVIEW, DOCUMENT, OTHER)',
  _CALN: 'Call number of a source that names no archive',
  _UID: 'Identifier of a source citation (one citation can support several facts)',
} as const;

/** Media type from the file extension (GEDCOM 5.5.1 only gives the extension under FORM) */
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  heic: 'image/heic',
  pdf: 'application/pdf',
  txt: 'text/plain',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
};
const EXTENSION_BY_MIME = Object.fromEntries(Object.entries(MIME_BY_EXTENSION).map(([ext, mime]) => [mime, ext]));
const extensionOf = (file: string) => (file.split('/').pop() ?? '').split('.').slice(1).pop()?.toLowerCase() ?? '';

/** Identifiers from UID/_UID: UUIDs of the app, but also GUIDs of other programs – one word, not too long */
const UID = /^\S{1,100}$/;

const CATEGORIES: readonly string[] = EVENT_CATEGORIES;

/** Technical details without an equivalent that are not kept as a note */
const IGNORED_TAGS = new Set(['CHAN', 'RIN', 'UID', '_UID', 'REFN', 'AFN', 'RFN', 'SUBM', 'ANCI', 'DESI', 'FAMC', 'FAMS', 'EXID', 'CREA']);

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export interface GedcomNode {
  level: number;
  xref?: string;
  tag: string;
  value: string;
  children: GedcomNode[];
  line: number;
}

const LINE = /^\s*(\d{1,2})\s+(?:(@[^@\s]+@)\s+)?([A-Za-z0-9_]+)(?: (.*))?$/;

/** Splits GEDCOM text into a tree; CONC/CONT are joined into multi-line values. */
export function parseGedcomTree(text: string): GedcomNode[] {
  const roots: GedcomNode[] = [];
  const stack: GedcomNode[] = [];
  const errors: string[] = [];

  text.split(/\r\n|\r|\n/).forEach((raw, i) => {
    if (!raw.trim()) {
      return;
    }
    const m = raw.match(LINE);
    if (!m) {
      errors.push(`Line ${i + 1}: invalid`);
      return;
    }
    const level = Number(m[1]);
    // GEDCOM 7: a leading "@@" stands for "@"
    const value = (m[4] ?? '').replace(/^@@/, '@');
    const tag = m[3].toUpperCase();
    while (stack.length && stack.at(-1)!.level >= level) {
      stack.pop();
    }
    const parent = stack.at(-1);
    if (level > 0 && (!parent || parent.level !== level - 1)) {
      errors.push(`Line ${i + 1}: level ${level} without a parent line`);
      return;
    }
    if (tag === 'CONC' && parent) {
      parent.value += value;
      return;
    }
    if (tag === 'CONT' && parent) {
      parent.value += `\n${value}`;
      return;
    }
    const node: GedcomNode = { level, xref: m[2], tag, value, children: [], line: i + 1 };
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
    stack.push(node);
  });

  if (errors.length) {
    throw new TransferError('INVALID_GEDCOM', errors.slice(0, 20));
  }
  if (roots[0]?.tag !== 'HEAD') {
    throw new TransferError('INVALID_GEDCOM', ['The file does not start with "0 HEAD"']);
  }
  return roots;
}

const child = (node: GedcomNode, tag: string) => node.children.find((c) => c.tag === tag);
const childValue = (node: GedcomNode, tag: string) => child(node, tag)?.value.trim() || null;
const childrenOf = (node: GedcomNode, tag: string) => node.children.filter((c) => c.tag === tag);

/**
 * Unique identifier of a record (7.0: UID, 5.5.1: _UID). Used as the id so a repeated
 * import recognises the same record – for exports of the app as well as of other programs.
 */
function uidOf(node: GedcomNode) {
  const uid = childValue(node, 'UID') ?? childValue(node, '_UID');
  return uid && UID.test(uid) ? uid : null;
}

/** Time of the last change (CHAN.DATE with TIME, UTC) as an ISO timestamp */
function changedAt(node: GedcomNode): string | null {
  const chan = child(node, 'CHAN');
  const date = chan && child(chan, 'DATE');
  return date ? timestampOf(date) : null;
}

/** "29 SEP 2026" with sub-entry TIME "14:30:05.123" (UTC) → ISO timestamp */
function timestampOf(date: GedcomNode): string | null {
  const m = date.value
    .trim()
    .toUpperCase()
    .match(/^(\d{1,2}) ([A-Z]{3}) (\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  if (!m || month < 0) {
    return null;
  }
  const t = (childValue(date, 'TIME') ?? '').match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
  const [h, min, s, ms] = t ? [t[1], t[2], t[3] ?? '0', (t[4] ?? '0').padEnd(3, '0')] : ['0', '0', '0', '0'];
  const result = new Date(Date.UTC(Number(m[3]), month, Number(m[1]), Number(h), Number(min), Number(s), Number(ms)));
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

/** The media files of a GEDZIP file, as far as the conversion needs them (see ArchiveFiles) */
export interface MediaFiles {
  names: () => string[];
  has: (name: string) => boolean;
  size: (name: string) => number;
}

/**
 * Finds the file of a media entry in the GEDZIP file: path as given (also with "\", "./" or
 * URL-encoded), otherwise via the file name if it is unique.
 */
export function resolveMediaFile(files: MediaFiles, raw: string): string | null {
  let file = raw
    .trim()
    .replace(/\\/g, '/')
    .replace(/^file:\/*/i, '');
  try {
    file = decodeURIComponent(file);
  } catch {
    // not a valid URL encoding – use the path unchanged
  }
  file = file.replace(/^(\.\/)+/, '');
  if (files.has(file)) {
    return file;
  }
  const name = file.split('/').pop()!.toLowerCase();
  const candidates = files.names().filter((key) => key.split('/').pop()!.toLowerCase() === name);
  return candidates.length === 1 ? candidates[0] : null;
}

/** DATE of an entry; in GEDCOM 7 free text is under DATE.PHRASE */
function dateOf(node: GedcomNode, language: ImportLanguage) {
  const date = child(node, 'DATE');
  if (!date) {
    return null;
  }
  return fromGedcomDate(date.value.trim() || (childValue(date, 'PHRASE') ? `(${childValue(date, 'PHRASE')})` : ''), language);
}

/**
 * Converts GEDCOM (5.5.1 or 7.0) into the exchange format of the app. Persons, events and media with a
 * UID (from an export of the app) keep their id, all others get new ones. `files` are the files
 * of a GEDZIP file: media whose file is included are taken over, otherwise recorded as a note.
 */
export function parseGedcom(text: string, files?: MediaFiles, language: ImportLanguage = DEFAULT_IMPORT_LANGUAGE): TransferData {
  const roots = parseGedcomTree(text);
  const head = roots[0];
  const version = childValue(child(head, 'GEDC') ?? head, 'VERS') ?? 'unknown';
  const now = new Date().toISOString();

  // Assign identifiers from the file only once (the same record can be linked several times)
  const usedIds = new Set<string>();
  const freshId = (uid: string | null) => {
    const id = uid && !usedIds.has(uid) ? uid : randomUUID();
    usedIds.add(id);
    return id;
  };

  // Stand-alone notes (5.5.1: "0 @N1@ NOTE", 7.0: "0 @N1@ SNOTE") and sources for references
  const records = new Map(roots.filter((r) => r.xref).map((r) => [r.xref!, r]));
  const noteText = (n: GedcomNode) => (n.value.startsWith('@') && records.get(n.value) ? records.get(n.value)!.value : n.value).trim();

  /** Medium of an OBJE record or an embedded OBJE entry; text = file missing */
  const readMedia = (record: GedcomNode): TransferMedia | string | null => {
    const fileNode = child(record, 'FILE');
    const filePath = fileNode?.value.trim();
    if (!fileNode || !filePath) {
      return null;
    }
    const key = files ? resolveMediaFile(files, filePath) : null;
    if (!key) {
      return filePath;
    }
    const form = childValue(fileNode, 'FORM') ?? childValue(record, 'FORM');
    const mimeType = form?.includes('/') ? form.toLowerCase() : (MIME_BY_EXTENSION[(form || extensionOf(key)).toLowerCase()] ?? 'application/octet-stream');
    return {
      id: freshId(uidOf(record)),
      path: key,
      originalFileName: childValue(fileNode, 'TITL') ?? childValue(record, 'TITL') ?? key.split('/').pop()!,
      mimeType,
      sizeBytes: files!.size(key),
      type: /^y/i.test(childValue(record, '_PRIM') ?? '') ? 'PROFILE_PICTURE' : mimeType.startsWith('image/') ? 'PHOTO' : 'DOCUMENT',
      createdAt: now,
      updatedAt: now,
    };
  };

  // An OBJE record can be used by several persons and events (e.g. a group photo):
  // it is taken over only once and belongs to the first person that lists it directly ("1 OBJE"),
  // otherwise to the first person whose event contains it. The other references become links.
  const mediaByRecord = new Map<string, TransferMedia | string | null>();
  const ownerOf = new Map<string, string>();
  for (const indi of roots.filter((r) => r.tag === 'INDI' && r.xref)) {
    for (const link of childrenOf(indi, 'OBJE')) {
      const ref = link.value.trim();
      if (records.has(ref) && !ownerOf.has(ref)) {
        ownerOf.set(ref, indi.xref!);
      }
    }
  }
  const mediaOf = (link: GedcomNode, indiXref: string): { media: TransferMedia | string | null; owned: boolean } => {
    const ref = link.value.trim();
    const record = ref.startsWith('@') ? records.get(ref) : undefined;
    if (!record) {
      return { media: ref.startsWith('@') ? null : readMedia(link), owned: true };
    }
    if (!ownerOf.has(ref)) {
      ownerOf.set(ref, indiXref);
    }
    if (!mediaByRecord.has(ref)) {
      mediaByRecord.set(ref, readMedia(record));
    }
    return { media: mediaByRecord.get(ref)!, owned: ownerOf.get(ref) === indiXref };
  };

  // ---- Archives, sources and citations: one library for all family trees (see documentation/sources-concept.md, 5.4)
  const noteTexts = (node: GedcomNode) => [...childrenOf(node, 'NOTE'), ...childrenOf(node, 'SNOTE')].map(noteText).filter(Boolean).join('\n') || null;
  const repositories: TransferRepository[] = [];
  const repositoryIds = new Map<string, string>();
  for (const repo of roots.filter((n) => n.tag === 'REPO' && n.xref)) {
    const id = freshId(uidOf(repo));
    repositoryIds.set(repo.xref!, id);
    const addr = child(repo, 'ADDR');
    const at = changedAt(repo) ?? now;
    repositories.push({
      id,
      name: childValue(repo, 'NAME') ?? repo.xref!,
      address: addr
        ? [addr.value, ...['ADR1', 'ADR2', 'POST', 'CITY', 'CTRY'].map((t) => childValue(addr, t))].filter(Boolean).join('\n').trim() || null
        : null,
      url: childValue(repo, 'WWW'),
      email: childValue(repo, 'EMAIL'),
      phone: childValue(repo, 'PHON'),
      note: noteTexts(repo),
      isDeleted: false,
      createdAt: at,
      updatedAt: at,
    });
  }

  const sources: TransferSource[] = [];
  const sourceIds = new Map<string, string>();
  /** OBJE entries of sources and citations – resolved once the persons have taken their media */
  const scanLinks: Array<{ record: { mediaIds: string[]; note?: string | null }; link: GedcomNode }> = [];
  const newSource = (id: string, fields: Partial<TransferSource> & { title: string }, at = now): TransferSource => {
    const source: TransferSource = {
      id,
      type: 'OTHER',
      author: null,
      publication: null,
      abbreviation: null,
      text: null,
      repositoryId: null,
      callNumber: null,
      note: null,
      mediaIds: [],
      isDeleted: false,
      createdAt: at,
      updatedAt: at,
      ...fields,
    };
    sources.push(source);
    return source;
  };
  for (const record of roots.filter((n) => n.tag === 'SOUR' && n.xref)) {
    const id = freshId(uidOf(record));
    sourceIds.set(record.xref!, id);
    // One archive per source; further ones are kept in the note
    const [repo, ...further] = childrenOf(record, 'REPO');
    const nameOf = (r: GedcomNode) => repositories.find((x) => x.id === repositoryIds.get(r.value.trim()))?.name ?? null;
    const elsewhere = further.map((r) => `REPO: ${[nameOf(r), childValue(r, 'CALN')].filter(Boolean).join(', ')}`);
    const type = childValue(record, '_STYPE')?.toUpperCase();
    const source = newSource(
      id,
      {
        type: type && (SOURCE_TYPES as readonly string[]).includes(type) ? type : 'OTHER',
        title: childValue(record, 'TITL') ?? childValue(record, 'ABBR') ?? record.xref!,
        author: childValue(record, 'AUTH'),
        publication: childValue(record, 'PUBL'),
        abbreviation: childValue(record, 'ABBR'),
        text: childValue(record, 'TEXT'),
        repositoryId: repo ? (repositoryIds.get(repo.value.trim()) ?? null) : null,
        callNumber: (repo ? childValue(repo, 'CALN') : null) ?? childValue(record, '_CALN'),
        note: [noteTexts(record), ...elsewhere].filter(Boolean).join('\n') || null,
      },
      changedAt(record) ?? now,
    );
    for (const link of childrenOf(record, 'OBJE')) {
      scanLinks.push({ record: source, link });
    }
  }
  // 5.5.1 also allows a source as text right at the fact ("1 SOUR Taufbuch Musterstadt"): one source per text
  const inlineSources = new Map<string, string>();
  const inlineSource = (value: string, text: string | null) => {
    const firstLine = value.split('\n')[0].trim().slice(0, 200);
    const key = `${value}|${text ?? ''}`;
    let id = inlineSources.get(key);
    if (!id) {
      id = freshId(null);
      inlineSources.set(key, id);
      newSource(id, { title: firstLine || value.slice(0, 200), text: [value === firstLine ? null : value, text].filter(Boolean).join('\n') || null });
    }
    return id;
  };

  const citations: TransferCitation[] = [];
  const citationIds = new Map<string, string>();
  const normalized = (value: string | null | undefined) => (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  /** A source citation; equal ones (same source, page, date and transcription) become one citation with several facts */
  const citationOf = (node: GedcomNode): string | null => {
    const ref = node.value.trim();
    const sourceId = ref.startsWith('@') ? sourceIds.get(ref) : ref ? inlineSource(node.value.trim(), childValue(node, 'TEXT')) : null;
    if (!sourceId) {
      return null;
    }
    const data = child(node, 'DATA');
    const date = data ? dateOf(data, language) : null;
    const text =
      (data
        ? childrenOf(data, 'TEXT')
            .map((t) => t.value.trim())
            .filter(Boolean)
            .join('\n')
        : '') || null;
    const page = childValue(node, 'PAGE');
    const quay = childValue(node, 'QUAY');
    const quality = quay !== null && /^[0-3]$/.test(quay) ? Number(quay) : null;
    const uid = uidOf(node);
    const key = uid ?? [sourceId, page, date?.value, text].map(normalized).join('|');
    const known = citationIds.get(key);
    if (known) {
      return known;
    }
    const id = freshId(uid);
    citationIds.set(key, id);
    const citation: TransferCitation = {
      id,
      sourceId,
      page,
      date: date?.value ?? null,
      datePrecision: date?.precision ?? null,
      text,
      quality,
      note: noteTexts(node),
      mediaIds: [],
      createdAt: now,
      updatedAt: now,
    };
    citations.push(citation);
    for (const link of childrenOf(node, 'OBJE')) {
      scanLinks.push({ record: citation, link });
    }
    return id;
  };
  /** The citations below a node (SOUR entries) */
  const cite = (node: GedcomNode | undefined) =>
    node
      ? childrenOf(node, 'SOUR')
          .map(citationOf)
          .filter((id): id is string => !!id)
      : [];

  const ids = new Map<string, string>();
  const persons: TransferPerson[] = [];
  const byXref = new Map<string, TransferPerson>();

  for (const indi of roots.filter((r) => r.tag === 'INDI' && r.xref)) {
    const id = freshId(uidOf(indi));
    ids.set(indi.xref!, id);
    const person = parseIndividual(indi, id, changedAt(indi) ?? now, {
      noteText,
      records,
      mediaOf: (link) => mediaOf(link, indi.xref!),
      freshId,
      cite,
      citationOf,
      language,
    });
    persons.push(person);
    byXref.set(indi.xref!, person);
  }

  const relations: TransferRelation[] = [];
  const relation = (personAId: string, personBId: string, type: string, extra: Partial<TransferRelation> = {}) =>
    relations.push({ id: randomUUID(), personAId, personBId, type, active: true, citationIds: [], createdAt: now, updatedAt: now, ...extra });
  const unique = (list: string[]) => [...new Set(list)];

  for (const fam of roots.filter((r) => r.tag === 'FAM')) {
    const partners = [...childrenOf(fam, 'HUSB'), ...childrenOf(fam, 'WIFE')].map((n) => ids.get(n.value.trim())).filter((id): id is string => !!id);
    const kind = childValue(fam, '_TYPE');
    const marr = child(fam, 'MARR');
    const note = childrenOf(fam, 'NOTE').map(noteText).join('\n') || null;

    if (partners.length === 2 && kind !== 'NONE') {
      const [a, b] = partners;
      const bPerson = persons.find((p) => p.id === b)!;
      const type = marr ? (bPerson.gender === 'MALE' ? 'HUSBAND' : 'WIFE') : kind === 'LIFE_PARTNER' ? 'LIFE_PARTNER' : 'PARTNER';
      const place = marr ? childValue(marr, 'PLAC') : null;
      relation(a, b, type, {
        startDate: marr ? gedcomDateToIso(childValue(marr, 'DATE')) : null,
        endDate: gedcomDateToIso(childValue(fam, '_ENDE') ?? childValue(child(fam, 'DIV') ?? fam, 'DATE')),
        note: [place ? fill(WEDDING_IN[language], { place }) : null, note].filter(Boolean).join('\n') || null,
        // The family, its marriage and its divorce are facts of the partnership
        citationIds: unique([...cite(fam), ...cite(marr), ...cite(child(fam, 'DIV'))]),
      });
    }

    for (const chil of childrenOf(fam, 'CHIL')) {
      const childId = ids.get(chil.value.trim());
      if (!childId) {
        continue;
      }
      // Label/note of the parent-child relation is stored at the child under FAMC
      const indi = roots.find((r) => r.xref === chil.value.trim());
      const famc = indi && childrenOf(indi, 'FAMC').find((f) => f.value.trim() === fam.xref);
      const pedi = famc ? childValue(famc, 'PEDI')?.toLowerCase() : null;
      const label = (famc && childValue(famc, '_LABEL')) || (pedi === 'adopted' || pedi === 'foster' ? CHILD_LABELS[pedi][language] : null) || null;
      const note = famc ? childrenOf(famc, 'NOTE').map(noteText).join('\n') || null : null;
      // Citations below FAMC support each parent-child relation of this family
      const citationIds = famc ? unique(cite(famc)) : [];
      for (const parentId of partners) {
        relation(parentId, childId, 'CHILD', { label, note, citationIds });
      }
    }
  }

  // Links outside of families (ASSO): siblings without common parents and other relations
  for (const indi of roots.filter((r) => r.tag === 'INDI' && r.xref)) {
    for (const asso of childrenOf(indi, 'ASSO')) {
      const otherId = ids.get(asso.value.trim());
      if (!otherId) {
        continue;
      }
      const role = child(asso, 'ROLE');
      const text = childValue(asso, 'RELA') ?? (role ? (childValue(role, 'PHRASE') ?? role.value) : null) ?? '';
      const sibling = /^(geschwister|sibling|bruder|schwester|brother|sister)$/i.test(text.trim());
      relation(ids.get(indi.xref!)!, otherId, sibling ? 'SIBLING' : 'OTHER', {
        label: sibling || !text || /^(sonstige|other)$/i.test(text) ? null : text,
        citationIds: unique(cite(asso)),
      });
    }
  }

  // Scans of sources and citations: a file a person has taken already is linked, the others belong to the library
  const libraryMedia: TransferMedia[] = [];
  for (const { record, link } of scanLinks) {
    const ref = link.value.trim();
    const target = ref.startsWith('@') ? records.get(ref) : undefined;
    let found: TransferMedia | string | null;
    if (target) {
      if (!mediaByRecord.has(ref)) {
        const media = readMedia(target);
        mediaByRecord.set(ref, media);
        if (media && typeof media !== 'string') {
          libraryMedia.push(media);
        }
      }
      found = mediaByRecord.get(ref)!;
    } else {
      found = ref.startsWith('@') ? null : readMedia(link);
      if (found && typeof found !== 'string') {
        libraryMedia.push(found);
      }
    }
    if (typeof found === 'string') {
      record.note = [record.note, fill(MEDIUM_MISSING[language], { file: found })].filter(Boolean).join('\n');
    } else if (found && !record.mediaIds.includes(found.id)) {
      record.mediaIds.push(found.id);
    }
  }

  // State of the file according to its header (HEAD.DATE); if missing, the time of reading counts
  const headDate = child(head, 'DATE');
  return {
    format: FORMAT_NAME,
    version: FORMAT_VERSION,
    exportedAt: (headDate && timestampOf(headDate)) ?? now,
    source: `GEDCOM ${version}`,
    persons,
    relations,
    repositories,
    sources,
    citations,
    libraryMedia,
  };
}

interface ParseContext {
  noteText: (n: GedcomNode) => string;
  records: Map<string, GedcomNode>;
  /** Medium of an OBJE entry and whether it belongs to this person (otherwise only linked) */
  mediaOf: (link: GedcomNode) => { media: TransferMedia | string | null; owned: boolean };
  freshId: (uid: string | null) => string;
  /** The citations below a node (its SOUR entries) */
  cite: (node: GedcomNode | undefined) => string[];
  /** One SOUR entry as a citation */
  citationOf: (node: GedcomNode) => string | null;
  /** Language of the user: titles of standard events and words of approximate dates */
  language: ImportLanguage;
}

function parseIndividual(indi: GedcomNode, id: string, now: string, { noteText, mediaOf, freshId, cite, citationOf, language }: ParseContext): TransferPerson {
  const names = childrenOf(indi, 'NAME');
  const isBirthName = (n: GedcomNode) => /^(birth|maiden)$/i.test(childValue(n, 'TYPE') ?? '');
  const main = names.find((n) => !isBirthName(n)) ?? names[0];
  const birthName = names.find((n) => n !== main && isBirthName(n));

  const splitName = (n?: GedcomNode) => {
    if (!n) {
      return { given: '', surname: '' };
    }
    const m = n.value.match(/^([^/]*)\/([^/]*)\/?(.*)$/);
    const given = childValue(n, 'GIVN') ?? (m ? m[1] : n.value).trim();
    const surname = childValue(n, 'SURN') ?? (m ? m[2] : '').trim();
    return { given, surname };
  };
  const { given, surname } = splitName(main);
  const [firstName, ...weitere] = given.split(/\s+/).filter(Boolean);

  const events: TransferPerson['events'] = [];
  const notes: TransferPerson['notes'] = [];
  const media: TransferPerson['media'] = [];
  const person: TransferPerson = {
    id,
    firstName: firstName || UNKNOWN_GIVEN_NAME,
    middleName: weitere.join(' ') || null,
    lastName: surname || null,
    birthName: birthName ? splitName(birthName).surname || null : null,
    title: main ? childValue(main, 'NPFX') : null,
    nickname: main ? childValue(main, 'NICK') : null,
    gender: { M: 'MALE', F: 'FEMALE' }[childValue(indi, 'SEX')?.toUpperCase() ?? ''] ?? 'UNKNOWN',
    languages: [],
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    events,
    notes,
    media,
    citations: [],
  };
  const addNote = (text: string) => text.trim() && notes.push({ id: randomUUID(), text: text.trim(), createdAt: now, updatedAt: now });
  /** Citations of a fact of the person (the person as a whole, name, birth, death) */
  const addCitations = (citationIds: string[], fact: string) => person.citations.push(...citationIds.map((citationId) => ({ citationId, fact })));
  const addMedia = (link: GedcomNode, event?: TransferPerson['events'][number]) => {
    const { media: found, owned } = mediaOf(link);
    if (typeof found === 'string') {
      if (owned) {
        addNote(fill(MEDIUM_MISSING[language], { file: found }));
      }
      return;
    }
    if (!found) {
      return;
    }
    if (owned && !media.includes(found)) {
      media.push(found);
      if (/^y/i.test(childValue(link, '_PRIM') ?? '')) {
        found.type = 'PROFILE_PICTURE';
      }
      if (found.type === 'PROFILE_PICTURE' && !person.profilePictureId) {
        person.profilePictureId = found.id;
      }
    }
    if (event && !event.mediaIds.includes(found.id)) {
      event.mediaIds.push(found.id);
    }
  };
  const addEvent = (node: GedcomNode, category: string, title: string) => {
    const date = dateOf(node, language);
    const event: TransferPerson['events'][number] = {
      id: freshId(uidOf(node)),
      title,
      category,
      date: date?.value ?? null,
      datePrecision: date?.precision ?? null,
      place: childValue(node, 'PLAC'),
      description: childrenOf(node, 'NOTE').map(noteText).join('\n') || null,
      mediaIds: [],
      citationIds: cite(node),
      createdAt: now,
      updatedAt: now,
    };
    events.push(event);
    for (const link of childrenOf(node, 'OBJE')) {
      addMedia(link, event);
    }
  };

  let hasResidence = false;
  for (const node of indi.children) {
    switch (node.tag) {
      case 'NAME':
        addCitations(cite(node), 'NAME');
        break;
      case 'SEX':
      case 'ASSO':
        break;
      case 'BIRT':
      case 'DEAT': {
        const key = node.tag === 'BIRT' ? 'birth' : 'death';
        const date = dateOf(node, language);
        if (key === 'birth' && !person.birthDate && !person.birthPlace) {
          person.birthDate = date?.value ?? null;
          person.birthDatePrecision = date?.precision ?? null;
          person.birthPlace = childValue(node, 'PLAC');
          addCitations(cite(node), 'BIRTH');
        } else if (key === 'death' && !person.deathDate && !person.deathPlace) {
          person.deathDate = date?.value ?? null;
          person.deathDatePrecision = date?.precision ?? null;
          person.deathPlace = childValue(node, 'PLAC');
          addCitations(cite(node), 'DEATH');
        } else {
          addEvent(node, key === 'birth' ? 'BIRTH' : 'DEATH', (key === 'birth' ? BIRTH_TITLE : DEATH_TITLE)[language]);
        }
        break;
      }
      case 'OCCU':
        // The occupation of the person; one with a date (or a further one) is a life event
        if (!person.occupation && !child(node, 'DATE')) {
          person.occupation = node.value.trim() || null;
          addCitations(cite(node), 'GENERAL');
        } else {
          addEvent(node, 'OCCUPATION', node.value.trim() || OCCUPATION_TITLE[language]);
        }
        break;
      case 'NATI':
        person.nationality ??= node.value.trim() || null;
        break;
      case 'RESI': {
        const addr = child(node, 'ADDR');
        if (!hasResidence && (addr || child(node, 'PHON') || child(node, 'EMAIL'))) {
          hasResidence = true;
          if (addr) {
            const lines = [addr.value, ...['ADR1', 'ADR2', 'POST', 'CITY', 'CTRY'].map((t) => childValue(addr, t))];
            person.address = lines.filter(Boolean).join('\n').trim() || null;
          }
          person.phone ??= childValue(node, 'PHON');
          person.email ??= childValue(node, 'EMAIL');
        } else {
          addEvent(node, 'MOVE', childValue(node, 'TYPE') ?? RESIDENCE_TITLE[language]);
        }
        break;
      }
      case 'PHON':
        person.phone ??= node.value.trim() || null;
        break;
      case 'EMAIL':
        person.email ??= node.value.trim() || null;
        break;
      case '_HOBBY':
        person.hobbies = [person.hobbies, node.value.trim()].filter(Boolean).join(', ') || null;
        break;
      case '_FAMSTAND':
        person.maritalStatus = node.value.trim() || null;
        break;
      case '_LANGUAGE':
        if (node.value.trim()) {
          // Other programs write the name ("German") or a language tag ("de-DE"): store the code like the app does
          const code = languageCode(node.value);
          if (!person.languages.includes(code)) {
            person.languages.push(code);
          }
        }
        break;
      case 'NOTE':
      case 'SNOTE':
        addNote(noteText(node));
        // A citation without a fact of its own belongs to the person
        addCitations(cite(node), 'GENERAL');
        break;
      case 'EVEN': {
        const type = childValue(node, 'TYPE');
        const category = type && CATEGORIES.includes(type.toUpperCase()) ? type.toUpperCase() : 'OTHER';
        addEvent(node, category, node.value.trim() || type || EVENT_TITLE[language]);
        break;
      }
      case 'SOUR': {
        const citation = citationOf(node);
        addCitations(citation ? [citation] : [], 'GENERAL');
        break;
      }
      case 'OBJE':
        addMedia(node);
        addCitations(cite(node), 'GENERAL');
        break;
      default:
        if (STANDARD_EVENTS[node.tag]) {
          const { category, title } = STANDARD_EVENTS[node.tag];
          addEvent(node, category, childValue(node, 'TYPE') ?? title[language]);
        } else if (!IGNORED_TAGS.has(node.tag)) {
          // Details that cannot be mapped are kept as a note
          addNote(`${node.tag}: ${flatten(node)}`);
        }
    }
  }
  return person;
}

/** Value of a node including its sub-entries as readable text */
function flatten(node: GedcomNode): string {
  const parts = [node.value.trim(), ...node.children.map((c) => `${c.tag} ${flatten(c)}`.trim())];
  return parts.filter(Boolean).join(', ');
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Creates a GEDCOM file (without the recycle bin). With `media` the media are listed as OBJE records with
 * their path inside the GEDZIP file. Persons, events and media carry their id as UID,
 * persons the time of their last change (CHAN) – so a repeated import recognises them. Archives and sources become REPO
 * and SOUR records; a citation is written out at every fact it supports (GEDCOM has no shared citations), with its id
 * as _UID so the import makes it one citation again.
 */
export function toGedcom(data: TransferData, version: GedcomVersion = '5.5.1', now = new Date(), options: { media?: boolean } = {}): string {
  const v7 = version === '7.0';
  const uidTag = v7 ? 'UID' : '_UID';
  const out: string[] = [];
  // GEDCOM 5.5.1: lines have at most 255 characters – continue long values with CONC (do not split before a space)
  const chunks = (text: string): string[] => {
    if (v7 || text.length <= 200) {
      return [text];
    }
    const result: string[] = [];
    let rest = text;
    while (rest.length > 200) {
      let cut = 200;
      while (cut > 1 && (rest[cut] === ' ' || rest[cut - 1] === ' ')) {
        cut--;
      }
      result.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    return [...result, rest];
  };
  // GEDCOM 7: a leading "@" is written as "@@"
  const escape = (text: string) => (v7 && text.startsWith('@') && !/^@[^@\s]+@$/.test(text) ? `@${text}` : text);
  const line = (level: number, tag: string, value: string, xref?: string) => out.push([String(level), xref, tag, value || undefined].filter(Boolean).join(' '));
  const push = (level: number, tag: string, value?: string | null, xref?: string) => {
    const [first, ...rest] = (value ?? '').split(/\r\n|\r|\n/);
    const [head, ...conc] = chunks(escape(first));
    line(level, tag, head, xref);
    for (const c of conc) {
      line(level + 1, 'CONC', c);
    }
    for (const r of rest) {
      const [h, ...more] = chunks(r);
      line(level + 1, 'CONT', h);
      for (const c of more) {
        line(level + 1, 'CONC', c);
      }
    }
  };
  const pushDate = (level: number, value: string | null | undefined) => {
    const date = toGedcomDate(value);
    if (!date) {
      return;
    }
    if ('date' in date) {
      push(level, 'DATE', date.date);
    } else if (v7) {
      push(level, 'DATE');
      push(level + 1, 'PHRASE', date.phrase);
    } else {
      push(level, 'DATE', `(${date.phrase})`);
    }
  };

  /**
   * First lines of a life event: baptism, occupation and residence as the standard tags other programs know (the title
   * as TYPE, for an occupation as its value), the other kinds as EVEN with the kind as TYPE. An occupation without a
   * date stays EVEN when the person has no occupation of its own – the import would take it as that.
   */
  const pushEventHead = (e: { title: string; category: string; date?: string | null }, hasOccupation: boolean) => {
    if (e.category === 'BAPTISM' || e.category === 'MOVE') {
      push(1, e.category === 'BAPTISM' ? 'BAPM' : 'RESI');
      push(2, 'TYPE', e.title);
    } else if (e.category === 'OCCUPATION' && (e.date || hasOccupation)) {
      push(1, 'OCCU', e.title);
    } else {
      push(1, 'EVEN', e.title);
      push(2, 'TYPE', e.category);
    }
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const pushChanged = (level: number, iso: string) => {
    const d = new Date(iso);
    push(level, 'CHAN');
    push(level + 1, 'DATE', `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`);
    push(level + 2, 'TIME', `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${String(d.getUTCMilliseconds()).padStart(3, '0')}`);
  };
  // Media as separate OBJE records; references at the person or the event
  const mediaXref = new Map<string, string>();
  const mediaRecords: TransferMedia[] = [];
  if (options.media) {
    for (const m of [...data.persons.filter((person) => !person.isDeleted).flatMap((p) => p.media), ...data.libraryMedia]) {
      mediaXref.set(m.id, `@M${mediaRecords.length + 1}@`);
      mediaRecords.push(m);
    }
  }

  // Sources outside the recycle bin with their archives; citations of sources in the recycle bin are left out
  const repositories = data.repositories.filter((r) => !r.isDeleted);
  const repositoryXref = new Map(repositories.map((r, i) => [r.id, `@R${i + 1}@`]));
  const sources = data.sources.filter((src) => !src.isDeleted);
  const sourceXref = new Map(sources.map((src, i) => [src.id, `@S${i + 1}@`]));
  const citationById = new Map(data.citations.map((c) => [c.id, c]));
  const pushCitations = (level: number, citationIds: string[]) => {
    for (const id of citationIds) {
      const c = citationById.get(id);
      const source = c && sourceXref.get(c.sourceId);
      if (!c || !source) {
        continue;
      }
      push(level, 'SOUR', source);
      if (c.page) {
        push(level + 1, 'PAGE', c.page);
      }
      if (c.date || c.text) {
        push(level + 1, 'DATA');
        pushDate(level + 2, c.date);
        if (c.text) {
          push(level + 2, 'TEXT', c.text);
        }
      }
      if (c.quality !== null && c.quality !== undefined) {
        push(level + 1, 'QUAY', String(c.quality));
      }
      for (const mediaId of c.mediaIds.filter((m) => mediaXref.has(m))) {
        push(level + 1, 'OBJE', mediaXref.get(mediaId));
      }
      if (c.note) {
        push(level + 1, 'NOTE', c.note);
      }
      push(level + 1, '_UID', c.id);
    }
  };
  push(0, 'HEAD');
  if (v7) {
    push(1, 'GEDC');
    push(2, 'VERS', '7.0');
    push(1, 'SCHMA');
    for (const tag of Object.keys(EXTENSION_TAGS)) {
      push(2, 'TAG', `${tag} https://cognatio.local/gedcom/${tag}`);
    }
  }
  push(1, 'SOUR', 'Cognatio');
  push(2, 'NAME', 'Cognatio');
  push(1, 'DATE', `${now.getUTCDate()} ${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`);
  push(2, 'TIME', `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}.${String(now.getUTCMilliseconds()).padStart(3, '0')}`);
  if (!v7) {
    push(1, 'SUBM', '@U1@');
    push(1, 'GEDC');
    push(2, 'VERS', '5.5.1');
    push(2, 'FORM', 'LINEAGE-LINKED');
    push(1, 'CHAR', 'UTF-8');
  }

  const persons = data.persons.filter((p) => !p.isDeleted);
  const xref = new Map(persons.map((p, i) => [p.id, `@I${i + 1}@`]));
  // Relations in the recycle bin stay out: a file read in again would bring them back as active ones
  const relations = data.relations.filter((r) => r.active !== false && xref.has(r.personAId) && xref.has(r.personBId));
  const gender = new Map(persons.map((p) => [p.id, p.gender]));

  // Families: partnerships and parent couples (or single parents) with their children
  interface Family {
    xref: string;
    partners: string[];
    partnerRel?: TransferRelation;
    children: string[];
  }
  const families: Family[] = [];
  const familyKey = (ids: string[]) => [...ids].sort().join('|');
  const familyByKey = new Map<string, Family>();
  const familyFor = (ids: string[]) => {
    const key = familyKey(ids);
    let fam = familyByKey.get(key);
    if (!fam) {
      fam = { xref: `@F${families.length + 1}@`, partners: [...ids], children: [] };
      families.push(fam);
      familyByKey.set(key, fam);
    }
    return fam;
  };
  for (const r of relations) {
    if (PARTNER_TYPES.includes(r.type)) {
      const fam = familyFor([r.personAId, r.personBId]);
      fam.partnerRel ??= r;
    }
  }
  const parentsOf = new Map<string, Set<string>>();
  const childLink = new Map<string, TransferRelation>();
  for (const r of relations) {
    const pc = parentChildOf(r);
    if (!pc) {
      continue;
    }
    if (!parentsOf.has(pc.childId)) {
      parentsOf.set(pc.childId, new Set());
    }
    parentsOf.get(pc.childId)!.add(pc.parentId);
    if (!childLink.has(pc.childId) && (r.label || r.note)) {
      childLink.set(pc.childId, r);
    }
  }
  const childFamily = new Map<string, Family>();
  for (const [childId, parents] of parentsOf) {
    // More than two parents cannot be represented in one GEDCOM family – the first two count
    const fam = familyFor([...parents].slice(0, 2));
    fam.children.push(childId);
    childFamily.set(childId, fam);
  }

  // Relations that are not expressed via families
  const siblingsViaFamily = (a: string, b: string) => !!childFamily.get(a) && childFamily.get(a) === childFamily.get(b);
  const associations = relations.filter((r) => r.type === 'OTHER' || (r.type === 'SIBLING' && !siblingsViaFamily(r.personAId, r.personBId)));

  // Citations of a parent-child relation are written below FAMC of the child
  const childCitations = new Map<string, string[]>();
  for (const r of relations) {
    const pc = parentChildOf(r);
    if (pc && r.citationIds.length) {
      childCitations.set(pc.childId, [...new Set([...(childCitations.get(pc.childId) ?? []), ...r.citationIds])]);
    }
  }

  for (const p of persons) {
    const factCitations = (fact: string) => p.citations.filter((c) => c.fact === fact).map((c) => c.citationId);
    push(0, 'INDI', null, xref.get(p.id));
    const given = [isUnknownGivenName(p.firstName) ? null : p.firstName, p.middleName].filter(Boolean).join(' ');
    const nameValue = (surname: string) => [given, `/${surname}/`].filter(Boolean).join(' ');
    push(1, 'NAME', nameValue(p.lastName ?? ''));
    if (given) {
      push(2, 'GIVN', given);
    }
    if (p.lastName) {
      push(2, 'SURN', p.lastName);
    }
    if (p.title) {
      push(2, 'NPFX', p.title);
    }
    if (p.nickname) {
      push(2, 'NICK', p.nickname);
    }
    pushCitations(2, factCitations('NAME'));
    if (p.birthName) {
      push(1, 'NAME', nameValue(p.birthName));
      push(2, 'TYPE', v7 ? 'BIRTH' : 'birth');
      push(2, 'SURN', p.birthName);
    }
    push(1, 'SEX', p.gender === 'MALE' ? 'M' : p.gender === 'FEMALE' ? 'F' : 'U');
    const birthCitations = factCitations('BIRTH');
    if (p.birthDate || p.birthPlace || birthCitations.length) {
      push(1, 'BIRT');
      pushDate(2, p.birthDate);
      if (p.birthPlace) {
        push(2, 'PLAC', p.birthPlace);
      }
      pushCitations(2, birthCitations);
    }
    const deathCitations = factCitations('DEATH');
    if (p.deathDate || p.deathPlace || deathCitations.length) {
      push(1, 'DEAT');
      pushDate(2, p.deathDate);
      if (p.deathPlace) {
        push(2, 'PLAC', p.deathPlace);
      }
      pushCitations(2, deathCitations);
    }
    if (p.occupation) {
      push(1, 'OCCU', p.occupation);
    }
    if (p.nationality) {
      push(1, 'NATI', p.nationality);
    }
    if (p.address || p.phone || p.email) {
      push(1, 'RESI');
      if (p.address) {
        push(2, 'ADDR', p.address);
      }
      if (p.phone) {
        push(2, 'PHON', p.phone);
      }
      if (p.email) {
        push(2, 'EMAIL', p.email);
      }
    }
    if (p.hobbies) {
      push(1, '_HOBBY', p.hobbies);
    }
    if (p.maritalStatus) {
      push(1, '_FAMSTAND', p.maritalStatus);
    }
    for (const s of p.languages) {
      push(1, '_LANGUAGE', s);
    }
    for (const e of p.events) {
      pushEventHead(e, Boolean(p.occupation));
      pushDate(2, e.date);
      if (e.place) {
        push(2, 'PLAC', e.place);
      }
      if (e.description) {
        push(2, 'NOTE', e.description);
      }
      // Linked media, also those of other persons (reference to their OBJE record)
      for (const id of e.mediaIds.filter((mediaId) => mediaXref.has(mediaId))) {
        push(2, 'OBJE', mediaXref.get(id));
      }
      pushCitations(2, e.citationIds);
      push(2, uidTag, e.id);
    }
    // All own media at the person – so a repeated import knows who the file belongs to
    for (const m of p.media.filter((media) => mediaXref.has(media.id))) {
      push(1, 'OBJE', mediaXref.get(m.id));
      if (m.id === p.profilePictureId) {
        push(2, '_PRIM', 'Y');
      }
    }
    for (const n of p.notes) {
      push(1, 'NOTE', n.text);
    }
    pushCitations(1, factCitations('GENERAL'));
    for (const r of associations.filter((a) => a.personAId === p.id)) {
      push(1, 'ASSO', xref.get(r.personBId));
      const role = r.type === 'SIBLING' ? 'Sibling' : r.label || 'Other';
      if (v7) {
        push(2, 'ROLE', 'OTHER');
        push(3, 'PHRASE', role);
      } else {
        push(2, 'RELA', role);
      }
      pushCitations(2, r.citationIds);
    }
    const famc = childFamily.get(p.id);
    if (famc) {
      push(1, 'FAMC', famc.xref);
      const link = childLink.get(p.id);
      if (link?.label) {
        push(2, '_LABEL', link.label);
      }
      if (link?.note) {
        push(2, 'NOTE', link.note);
      }
      pushCitations(2, childCitations.get(p.id) ?? []);
    }
    for (const fam of families.filter((f) => f.partners.includes(p.id))) {
      push(1, 'FAMS', fam.xref);
    }
    push(1, uidTag, p.id);
    pushChanged(1, p.updatedAt);
  }

  for (const fam of families) {
    push(0, 'FAM', null, fam.xref);
    // HUSB/WIFE by gender, otherwise in the order they were recorded
    const [a, b] = fam.partners;
    const aIsWife = gender.get(a) === 'FEMALE' && (!b || gender.get(b) !== 'FEMALE');
    const [husb, wife] = aIsWife ? [b, a] : [a, b];
    if (husb) {
      push(1, 'HUSB', xref.get(husb));
    }
    if (wife) {
      push(1, 'WIFE', xref.get(wife));
    }
    for (const c of fam.children) {
      push(1, 'CHIL', xref.get(c));
    }
    const rel = fam.partnerRel;
    if (rel) {
      if (rel.type === 'HUSBAND' || rel.type === 'WIFE') {
        push(1, 'MARR');
        if (rel.startDate) {
          push(2, 'DATE', isoToGedcomDate(rel.startDate));
        }
      } else {
        push(1, '_TYPE', rel.type);
      }
      if (rel.endDate) {
        push(1, '_ENDE', isoToGedcomDate(rel.endDate));
      }
      if (rel.note) {
        push(1, 'NOTE', rel.note);
      }
      pushCitations(1, rel.citationIds);
    } else if (fam.partners.length === 2) {
      // Common children, but no recorded partnership
      push(1, '_TYPE', 'NONE');
    }
  }

  for (const r of repositories) {
    push(0, 'REPO', null, repositoryXref.get(r.id));
    push(1, 'NAME', r.name);
    if (r.address) {
      push(1, 'ADDR', r.address);
    }
    if (r.phone) {
      push(1, 'PHON', r.phone);
    }
    if (r.email) {
      push(1, 'EMAIL', r.email);
    }
    if (r.url) {
      push(1, 'WWW', r.url);
    }
    if (r.note) {
      push(1, 'NOTE', r.note);
    }
    push(1, uidTag, r.id);
    pushChanged(1, r.updatedAt);
  }

  for (const src of sources) {
    push(0, 'SOUR', null, sourceXref.get(src.id));
    if (src.author) {
      push(1, 'AUTH', src.author);
    }
    push(1, 'TITL', src.title);
    if (src.abbreviation) {
      push(1, 'ABBR', src.abbreviation);
    }
    if (src.publication) {
      push(1, 'PUBL', src.publication);
    }
    if (src.text) {
      push(1, 'TEXT', src.text);
    }
    const repo = src.repositoryId ? repositoryXref.get(src.repositoryId) : undefined;
    if (repo) {
      push(1, 'REPO', repo);
      if (src.callNumber) {
        push(2, 'CALN', src.callNumber);
      }
    } else if (src.callNumber) {
      push(1, '_CALN', src.callNumber);
    }
    push(1, '_STYPE', src.type);
    for (const mediaId of src.mediaIds.filter((m) => mediaXref.has(m))) {
      push(1, 'OBJE', mediaXref.get(mediaId));
    }
    if (src.note) {
      push(1, 'NOTE', src.note);
    }
    push(1, uidTag, src.id);
    pushChanged(1, src.updatedAt);
  }

  for (const m of mediaRecords) {
    push(0, 'OBJE', null, mediaXref.get(m.id));
    push(1, 'FILE', m.path);
    push(2, 'FORM', v7 ? m.mimeType : (EXTENSION_BY_MIME[m.mimeType] ?? extensionOf(m.path)));
    const kind = m.mimeType.startsWith('image/') ? 'PHOTO' : 'DOCUMENT';
    push(3, v7 ? 'MEDI' : 'TYPE', v7 ? kind : kind.toLowerCase());
    push(2, 'TITL', m.originalFileName);
    push(1, uidTag, m.id);
  }

  if (!v7) {
    push(0, 'SUBM', null, '@U1@');
    push(1, 'NAME', 'Cognatio');
  }
  push(0, 'TRLR');
  return out.join('\r\n') + '\r\n';
}
