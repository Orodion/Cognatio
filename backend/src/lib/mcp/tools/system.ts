import { z } from 'zod';
import { LOG_LEVELS, logger } from '../../logger.js';
import { readLogTail } from '../../logFiles.js';
import { MAX_LIMIT_MB, MIN_LIMIT_MB } from '../../transfer/limits.js';
import { defineTool, id } from '../tool.js';
import { fullName, type PersonRow } from './format.js';

const LIMITS = 'sizeLimits { importMb backupMb minMb maxMb }';

export const getSettings = defineTool({
  name: 'get_settings',
  title: 'Get the settings',
  description:
    'Version, log level, size limits of import and backup files, backup folder and the numbers of the whole app. databaseBackupCount counts the automatic database backups of the app; the ZIP backups are listed by list_backups.',
  area: 'settings',
  level: 'read',
  input: {},
  run: async (_args, { gql }) => {
    const { systemInfo, sizeLimits } = await gql<{ systemInfo: Record<string, unknown>; sizeLimits: unknown }>(
      `query { systemInfo { version database trees persons deletedPersons media mediaBytes lastImportAt lastBackupAt backupCount backupDir logLevel } ${LIMITS} }`,
    );
    // The app counts its automatic database backups here; list_backups shows the backups as ZIP files
    const { lastBackupAt, backupCount, ...rest } = systemInfo;
    return { data: { systemInfo: { ...rest, lastDatabaseBackupAt: lastBackupAt, databaseBackupCount: backupCount }, sizeLimits } };
  },
});

export const setSettings = defineTool({
  name: 'set_settings',
  title: 'Change the settings',
  description: `Changes the log level (until the next start) or the optional size limits of import/export and backup files in MB (${MIN_LIMIT_MB}–${MAX_LIMIT_MB}; null: no limit). The settings for AI assistants cannot be changed.`,
  area: 'settings',
  level: 'write',
  input: {
    logLevel: z.enum(LOG_LEVELS).optional(),
    importMb: z.number().int().nullable().optional(),
    backupMb: z.number().int().nullable().optional(),
  },
  run: async ({ logLevel, importMb, backupMb }, { gql }) => {
    if (logLevel) {
      await gql('mutation ($level: String!) { setLogLevel(level: $level) }', { level: logLevel });
    }
    if (importMb !== undefined || backupMb !== undefined) {
      const { sizeLimits } = await gql<{ sizeLimits: { importMb: number | null; backupMb: number | null } }>(`query { ${LIMITS} }`);
      await gql('mutation ($importMb: Int, $backupMb: Int) { setSizeLimits(importMb: $importMb, backupMb: $backupMb) { importMb } }', {
        importMb: importMb === undefined ? sizeLimits.importMb : importMb,
        backupMb: backupMb === undefined ? sizeLimits.backupMb : backupMb,
      });
    }
    return { data: await gql(`query { systemInfo { logLevel } ${LIMITS} }`), target: 'settings' };
  },
});

const NAME = 'id title firstName middleName lastName birthName';
const COUNT = 'count filter';
const CELL = 'mean count filter';
const STATISTICS_FIELDS = `total living deceased male female unknownGender relations averageLifespan withoutAge probablyDeceased
  families unconnected distinctSurnames distinctBirthplaces withBirthplace oldestBirth { year person { ${NAME} } }
  livingAges { from ${COUNT} } deathAges { from ${COUNT} } surnames { label ${COUNT} } birthplaces { label ${COUNT} }
  generations { generation earliestBirth latestBirth ${COUNT} }
  completeness { score rows { fact total present missing filter } }
  timeline { decades { decade births deaths weddings } withoutBirthYear withoutDeathYear }
  lives { tables { measure rows { century male { ${CELL} } female { ${CELL} } all { ${CELL} } } }
    children { key ${COUNT} } meanChildren ageGaps { key ${COUNT} } meanAgeGap }
  firstNames { male { label ${COUNT} } female { label ${COUNT} } fashion { century male { label ${COUNT} } female { label ${COUNT} } } }
  migration { stayed moved moves { from to ${COUNT} } places { place persons firstYear lastYear filter } morePlaces }
  records { kind value ties possibleError persons { ${NAME} } }
  ancestors { person { ${NAME} } isHomePerson hasHomePerson found distinct
    generations { generation possible found distinct openEnds earliestBirth latestBirth filter openEndsFilter } }`;

/** Fields only the page needs */
const PAGE_ONLY = new Set(['filter', 'openEndsFilter', '__typename']);
/** Fields that name persons: the holders of a record, the oldest birth, the start of the ancestors */
const PERSON_KEYS = new Set(['person', 'persons']);

/**
 * The figures without the filters of the page, persons as id and name (answers stay small) – or without the persons
 * when the assistant may not read persons, so the area "statistics" alone gives figures only
 */
function forAssistant(value: unknown, withPersons: boolean): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => forAssistant(item, withPersons));
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.firstName === 'string' && typeof record.id === 'string') {
      return { id: record.id, name: fullName(record as unknown as PersonRow) };
    }
    return Object.fromEntries(
      Object.entries(record)
        // `persons` of a place is a number and stays
        .filter(([key, v]) => !PAGE_ONLY.has(key) && (withPersons || !PERSON_KEYS.has(key) || typeof v !== 'object'))
        .map(([key, v]) => [key, forAssistant(v, withPersons)]),
    );
  }
  return value;
}

export const getStatistics = defineTool({
  name: 'get_statistics',
  title: 'Get the statistics',
  description:
    'The figures of the page "Statistics" for a family tree or a part of it (scope): persons, living and deceased, gender, ages, most common last names, first names and places, generations, what is still missing (research status 0–1), births, deaths and weddings per decade, life expectancy and ages at the first wedding and child per century of birth (a mean is null below 5 persons), children per couple, age gap of partners, migration, records of deceased persons, the ancestors of a person per generation (by default the home person of the family tree) and the use of sources (always of the whole family tree). Persons (record holders, oldest birth, start of the ancestors) are named only with permission to read persons, the most cited sources only with permission to read sources.',
  area: 'statistics',
  level: 'read',
  inTree: true,
  input: {
    scope: z
      .enum(['ALL', 'ANCESTORS', 'DESCENDANTS', 'SURNAME'])
      .optional()
      .describe('Part of the family tree: the ancestors or descendants of personId (included), the persons of a last name (also birth name); default ALL'),
    personId: id('Person of an ANCESTORS or DESCENDANTS scope').optional(),
    surname: z.string().optional().describe('Last name of a SURNAME scope'),
    bornFrom: z.number().int().optional().describe('Only persons born in this year or later'),
    bornTo: z.number().int().optional().describe('Only persons born in this year or earlier'),
    ancestorsOf: id('Start person of the ancestor figures (default: the person of the scope, else the home person)').optional(),
  },
  run: async ({ scope, personId, surname, bornFrom, bornTo, ancestorsOf }, { gql, can }) => {
    const { treeStatistics, sourceStatistics } = await gql<{ treeStatistics: Record<string, unknown>; sourceStatistics: Record<string, unknown> }>(
      `query ($scope: StatisticsScope, $ancestorsOf: ID) {
        treeStatistics(scope: $scope, language: "en", ancestorsOf: $ancestorsOf) { ${STATISTICS_FIELDS} }
        sourceStatistics { persons citedPersons citations sources topSources { title links } } }`,
      { scope: { kind: scope ?? 'ALL', personId, surname, bornFrom, bornTo }, ancestorsOf },
    );
    const { topSources, ...sourceCounts } = sourceStatistics;
    const sources = can('sources', 'read') ? { ...sourceCounts, topSources } : sourceCounts;
    return { data: { ...(forAssistant(treeStatistics, can('persons', 'read')) as Record<string, unknown>), sources } };
  },
});

const MAX_LOG_LINES = 500;

export const readLog = defineTool({
  name: 'read_log',
  title: 'Read the log',
  description: 'The newest lines of the log of the app (JSON per line), for finding the cause of an error.',
  area: 'statistics',
  level: 'read',
  input: {
    lines: z.number().int().min(1).max(MAX_LOG_LINES).optional().describe(`Number of lines (default 100, at most ${MAX_LOG_LINES})`),
    level: z.enum(LOG_LEVELS).optional().describe('Only lines of this level or higher'),
  },
  run: async ({ lines = 100, level }) => {
    const file = logger.file;
    const minimum = level ? LOG_LEVELS.indexOf(level) : 0;
    const tail = file ? readLogTail(file, level ? 5000 : lines) : [];
    const wanted = level
      ? tail.filter((line) => {
          const match = line.match(/"level":"(\w+)"/);
          return match ? LOG_LEVELS.indexOf(match[1] as (typeof LOG_LEVELS)[number]) >= minimum : false;
        })
      : tail;
    return { data: { level: logger.level, lines: wanted.slice(-lines) } };
  },
});

export const SYSTEM_TOOLS = [getSettings, setSettings, getStatistics, readLog];
