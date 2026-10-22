import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { IMPORT_HISTORY } from '@/features/transfer/graphql/importQueries';
import { ImportExportPage } from '../ImportExportPage';
import type { ImportPreview, ImportSummary } from '@/features/transfer/lib/transfer';
import { cycleText, filenameFrom, manualSummary } from '@/features/transfer/lib/transfer';
import { makeTree, treesMock } from '@/test/fixtures';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { useActivityStore } from '@/stores/activityStore';
import { useImportSession } from '@/features/transfer/lib/importSession';
import i18n from '@/i18n';

const summary = (overrides: Partial<ImportSummary> = {}): ImportSummary => ({
  newPersons: 1,
  updatedPersons: 0,
  unchangedPersons: 3,
  keptPersons: 0,
  removedPersons: 0,
  conflicts: 1,
  newRelations: 0,
  newEvents: 0,
  newNotes: 0,
  newMedia: 0,
  ...overrides,
});

const preview: ImportPreview = {
  kind: 'ZIP',
  target: 'CURRENT',
  suggestedTreeName: 'Muster',
  source: 'Cognatio',
  exportedAt: '2026-09-28T10:00:00.000Z',
  recognized: null,
  previousImports: [],
  existingPersons: 4,
  importedPersons: 5,
  missingFiles: [],
  conflicts: [
    {
      personId: 'p1',
      name: 'Anna Muster',
      existingUpdatedAt: '2026-09-28T11:00:00.000Z',
      importedUpdatedAt: '2026-09-28T10:00:00.000Z',
      importedNewer: false,
      changes: [{ field: 'birthPlace', existing: 'Bonn', imported: 'Köln' }],
    },
  ],
  summaries: {
    OVERWRITE: summary({ newPersons: 5, unchangedPersons: 0, removedPersons: 4, conflicts: 0 }),
    MERGE_NEWER: summary({ keptPersons: 1 }),
    MERGE_MANUAL: summary({ keptPersons: 1 }),
  },
  cycles: { OVERWRITE: [], MERGE_NEWER: [], MERGE_MANUAL: [] },
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Answers of the backend: previews and import results in order; the file goes up once (XMLHttpRequest) */
let previews: Response[];
let results: unknown[];
let uploads: number;
let fetchMock: ReturnType<typeof vi.fn>;

class FakeUpload {
  status = 201;
  responseText = JSON.stringify({ uploadId: 'u1', size: 1 });
  upload = {};
  onload?: () => void;
  open() {}
  setRequestHeader() {}
  send() {
    uploads += 1;
    setTimeout(() => this.onload?.(), 0);
  }
}

beforeEach(() => {
  useActiveTreeStore.setState({ treeId: 't1' });
  // The import page keeps its state outside the page (it outlives a change of page)
  useImportSession.setState(useImportSession.getInitialState(), true);
  useActivityStore.setState({ activities: [] });
  previews = [];
  results = [];
  uploads = 0;
  fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/v1/import/preview') {
      return previews.shift()!;
    }
    if (url === '/api/v1/import/execute') {
      return json({ jobId: 'j1' }, 202);
    }
    if (url.startsWith('/api/v1/jobs/')) {
      return json({ state: 'done', result: results.shift() });
    }
    throw new Error(`unexpected request ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('XMLHttpRequest', FakeUpload);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Calls of the backend under this address */
const calls = (url: string) => fetchMock.mock.calls.filter(([called]) => called === url) as Array<[string, RequestInit]>;
/** JSON body of the n-th call of this address */
const bodyOf = (url: string, n = 0) => JSON.parse(String(calls(url)[n][1].body));

const historyRecord = {
  __typename: 'ImportRecord',
  id: 'i1',
  importedAt: '2026-09-20T08:00:00.000Z',
  fileName: 'familie.gdz',
  kind: 'GEDCOM',
  source: 'GEDCOM 7.0',
  exportedAt: '2026-09-19T20:00:00.000Z',
  strategy: 'MERGE_NEWER',
  createdPersons: 3,
  updatedPersons: 2,
  removedPersons: 0,
  recognizedPersons: 5,
  createdRelations: 1,
  createdEvents: 0,
  createdNotes: 0,
  createdMedia: 4,
  missingFiles: 0,
};

function setup(history: unknown[] = [], trees: MockedResponse[] = [treesMock()]) {
  const mocks: MockedResponse[] = [
    { request: { query: IMPORT_HISTORY, variables: { limit: 20 } }, result: { data: { importHistory: history } }, maxUsageCount: Infinity },
    ...trees,
  ];
  render(
    <MemoryRouter>
      <MockedProvider mocks={mocks}>
        <ImportExportPage />
      </MockedProvider>
    </MemoryRouter>,
  );
}

const chooseFile = () =>
  fireEvent.change(screen.getByLabelText('importExport.import.file'), {
    target: { files: [new File(['x'], 'sicherung.zip', { type: 'application/zip' })] },
  });

const summaryRow = (key: string) => within(screen.getByTestId('import-summary')).getByText(`importExport.summary.${key}`).parentElement!;

describe('ImportExportPage', () => {
  it('shows the preview with backup hint and the summary of the chosen strategy', async () => {
    previews.push(json(preview));
    setup();
    chooseFile();

    expect(await screen.findByText('importExport.import.summaryTitle')).toBeInTheDocument();
    expect(bodyOf('/api/v1/import/preview')).toEqual({ uploadId: 'u1', target: 'CURRENT', language: i18n.language });
    expect(screen.getByText('importExport.import.backupHint')).toBeInTheDocument();
    expect(summaryRow('keptPersons')).toHaveTextContent('1');

    fireEvent.click(screen.getByLabelText(/importExport.strategies.OVERWRITE.label/));
    expect(summaryRow('removedPersons')).toHaveTextContent('4');
  });

  it('warns about persons who would be their own ancestors with the chosen strategy', async () => {
    previews.push(json({ ...preview, cycles: { ...preview.cycles, MERGE_NEWER: [['Anna Muster', 'Bert Muster']] } }));
    setup();
    chooseFile();

    expect(await screen.findByTestId('import-cycles')).toHaveTextContent('importExport.import.cycles');
    fireEvent.click(screen.getByLabelText(/importExport.strategies.OVERWRITE.label/));
    expect(screen.queryByTestId('import-cycles')).not.toBeInTheDocument();
    // A warning only – the import can still be started
    expect(screen.getByRole('button', { name: 'importExport.import.run' })).toBeEnabled();
  });

  it('lets the user decide conflicts manually and sends the decisions', async () => {
    previews.push(json(preview));
    results.push({ createdPersons: 1, updatedPersons: 1, removedPersons: 0, missingFiles: [], summary: summary() });
    setup();
    chooseFile();
    fireEvent.click(await screen.findByLabelText(/importExport.strategies.MERGE_MANUAL.label/));

    const conflict = screen.getByRole('listitem', { name: 'Anna Muster' });
    expect(within(conflict).getByText('Bonn')).toBeInTheDocument();
    expect(within(conflict).getByText('Köln')).toBeInTheDocument();
    fireEvent.click(within(conflict).getByLabelText('importExport.conflicts.take'));
    expect(summaryRow('updatedPersons')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: /importExport.import.run/ }));
    expect(await screen.findByText('importExport.import.success')).toBeInTheDocument();
    expect(bodyOf('/api/v1/import/execute')).toMatchObject({ uploadId: 'u1', strategy: 'MERGE_MANUAL', decisions: { p1: 'IMPORT' }, language: i18n.language });
    // The file went up once for the preview and the import
    expect(uploads).toBe(1);
  });

  it('sends the file to the open family tree and names it', async () => {
    previews.push(json(preview));
    setup();
    chooseFile();
    await screen.findByText('importExport.import.summaryTitle');
    // ZIP export of the app: by default into the open family tree
    expect(screen.getByLabelText('importExport.import.targetCurrent')).toBeChecked();
    const [, init] = calls('/api/v1/import/preview')[0];
    expect(bodyOf('/api/v1/import/preview').target).toBe('CURRENT');
    expect(init.headers).toMatchObject({ 'X-Family-Tree-Id': 't1' });
  });

  it('imports a GEDCOM file into a new family tree and opens it', async () => {
    const newTree: ImportPreview = { ...preview, target: 'NEW', existingPersons: 0, conflicts: [], suggestedTreeName: 'Brakenhof' };
    previews.push(json(newTree));
    results.push({ familyTreeId: 't7', createdPersons: 5, updatedPersons: 0, removedPersons: 0, missingFiles: [], summary: summary({ newPersons: 5 }) });
    // After the import the list knows the new family tree
    const current = { ...treesMock(), maxUsageCount: 1 };
    setup([], [current, treesMock([makeTree(), makeTree({ id: 't7', name: 'Familie Brakenhof' })])]);
    fireEvent.change(screen.getByLabelText('importExport.import.file'), {
      target: { files: [new File(['0 HEAD'], 'brakenhof.ged', { type: 'text/plain' })] },
    });
    await screen.findByText('importExport.import.summaryTitle');

    expect(screen.getByLabelText('importExport.import.targetNew')).toBeChecked();
    expect(bodyOf('/api/v1/import/preview').target).toBe('NEW');
    // Name from the server's suggestion, editable; there are no strategies for a new family tree
    const name = screen.getByLabelText('importExport.import.treeName');
    expect(name).toHaveValue('Brakenhof');
    expect(screen.queryByText('importExport.import.strategy')).not.toBeInTheDocument();
    expect(screen.queryByText('importExport.import.backupHint')).not.toBeInTheDocument();
    fireEvent.change(name, { target: { value: 'Familie Brakenhof' } });

    fireEvent.click(screen.getByRole('button', { name: /importExport.import.run/ }));
    expect(await screen.findByText('importExport.import.successNewTree')).toBeInTheDocument();
    expect(bodyOf('/api/v1/import/execute')).toMatchObject({ target: 'NEW', treeName: 'Familie Brakenhof' });
    await waitFor(() => expect(useActiveTreeStore.getState().treeId).toBe('t7'));
  });

  it('without a family tree imports only into a new one and offers no export', async () => {
    useActiveTreeStore.setState({ treeId: null });
    previews.push(json({ ...preview, target: 'NEW', existingPersons: 0, conflicts: [] }));
    setup([], [treesMock([])]);
    // As soon as the (empty) list of family trees is known
    await waitFor(() => expect(screen.queryByText('importExport.export.title')).not.toBeInTheDocument());
    expect(screen.queryByLabelText(/importExport.import.targetCurrent/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('importExport.import.targetNew')).toBeChecked();

    // Also a ZIP file (otherwise meant for the open family tree) goes into a new one
    chooseFile();
    await screen.findByText('importExport.import.summaryTitle');
    expect(bodyOf('/api/v1/import/preview').target).toBe('NEW');
  });

  it('checks the file again when the target changes', async () => {
    previews.push(json(preview), json({ ...preview, target: 'NEW', existingPersons: 0 }));
    setup();
    chooseFile();
    await screen.findByText('importExport.import.summaryTitle');
    fireEvent.click(screen.getByLabelText('importExport.import.targetNew'));
    await waitFor(() => expect(calls('/api/v1/import/preview')).toHaveLength(2));
    expect(bodyOf('/api/v1/import/preview', 1).target).toBe('NEW');
    expect(uploads).toBe(1);
    expect(await screen.findByLabelText('importExport.import.treeName')).toHaveValue('Muster');
  });

  it('keeps the check when the page is left and opened again', async () => {
    previews.push(json(preview));
    setup();
    chooseFile();
    await screen.findByText('importExport.import.summaryTitle');
    cleanup();

    // Back on the page: the preview and the chosen file are still there, nothing is uploaded again
    setup();
    expect(await screen.findByText('importExport.import.summaryTitle')).toBeInTheDocument();
    expect(screen.getByText('importExport.import.chosenFile')).toBeInTheDocument();
    expect(uploads).toBe(1);
    expect(useActivityStore.getState().activities[0]).toMatchObject({ kind: 'importCheck', state: 'done' });
  });

  it('asks before overwriting existing data', async () => {
    previews.push(json(preview));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    setup();
    chooseFile();
    fireEvent.click(await screen.findByLabelText(/importExport.strategies.OVERWRITE.label/));
    fireEvent.click(screen.getByRole('button', { name: /importExport.import.run/ }));
    expect(confirm).toHaveBeenCalled();
    expect(calls('/api/v1/import/execute')).toHaveLength(0);
  });

  it('shows validation errors with technical details', async () => {
    previews.push(json({ reason: 'INVALID_SCHEMA', details: ['persons.0.firstName: Required'] }, 400));
    setup();
    chooseFile();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('importExport.errors.INVALID_SCHEMA');
    expect(alert).toHaveTextContent('persons.0.firstName: Required');
  });

  it('checks the export first, then downloads it straight into the file', async () => {
    // The check, then the job of the download (the backend counts the bytes it sends)
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith('/api/v1/jobs/')
        ? json({ state: 'done', phase: 'download', done: 3, total: 3 })
        : json({ filename: 'family_tree_Muster_20260928_120000.zip', size: 3, missingMedia: 0 }),
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    setup();
    fireEvent.click(screen.getByLabelText('importExport.export.withMedia'));
    fireEvent.click(screen.getByRole('button', { name: /importExport.export.zipButton/ }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/export/zip?media=0&check=1', { headers: { 'X-Family-Tree-Id': 't1' } });
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('family_tree_Muster_20260928_120000.zip');
    // A link cannot send headers: the job and the family tree are in the address
    const activity = useActivityStore.getState().activities[0];
    expect(link.getAttribute('href')).toBe(`/api/v1/export/zip?media=0&activity=${activity.id}&familyTree=t1`);
    // Done when the backend has sent everything; also listed under "Activity"
    expect(await screen.findByText('importExport.export.done')).toBeInTheDocument();
    expect(useActivityStore.getState().activities[0]).toMatchObject({ kind: 'export', state: 'done', label: 'family_tree_Muster_20260928_120000.zip' });
  });

  it('exports GEDCOM with media on request', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith('/api/v1/jobs/') ? json({ state: 'done' }) : json({ filename: 'a_gedcom70.gdz', size: 3, missingMedia: 0 }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    setup();
    fireEvent.change(screen.getByLabelText('importExport.export.gedcomVersion'), { target: { value: '7.0' } });
    fireEvent.click(screen.getByLabelText('importExport.export.gedcomWithMedia'));
    fireEvent.click(screen.getByRole('button', { name: /importExport.export.gedcomButton/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/export/gedcom?version=7.0&media=1&check=1', { headers: { 'X-Family-Tree-Id': 't1' } }));
  });

  it('shows the progress of the import and can cancel it before the data is changed', async () => {
    previews.push(json(preview));
    let jobAnswers = 0;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === '/api/v1/import/preview') {
        return json(preview);
      }
      if (url === '/api/v1/import/execute') {
        return json({ jobId: 'j1' }, 202);
      }
      if (init?.method === 'DELETE') {
        return json({ cancelling: true }, 202);
      }
      jobAnswers += 1;
      return jobAnswers === 1
        ? json({ state: 'running', phase: 'media', done: 3, total: 4, cancellable: true })
        : json({ state: 'cancelled', result: { reason: 'CANCELLED' } });
    });
    setup();
    chooseFile();
    fireEvent.click(await screen.findByRole('button', { name: /importExport.import.run/ }));

    expect(await screen.findByRole('progressbar', { name: 'transferProgress.phases.media' })).toHaveAttribute('aria-valuenow', '75');
    fireEvent.click(screen.getByRole('button', { name: 'transferProgress.cancel' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/jobs/j1', expect.objectContaining({ method: 'DELETE' })));
    expect(await screen.findByText('importExport.errors.CANCELLED', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('warns about a file that was imported before and reports recognised persons', async () => {
    previews.push(
      json({
        ...preview,
        kind: 'GEDCOM',
        recognized: { byId: 3, byName: 1 },
        previousImports: [{ importedAt: '2026-09-20T08:00:00.000Z', strategy: 'MERGE_NEWER', fileName: 'sicherung.zip' }],
      }),
    );
    setup();
    chooseFile();
    expect(await screen.findByText('importExport.import.previousImport')).toBeInTheDocument();
    expect(screen.getByText('importExport.import.recognized')).toBeInTheDocument();
  });

  it('lists previous imports', async () => {
    setup([historyRecord]);
    const row = (await screen.findByText('familie.gdz')).closest('tr')!;
    expect(row).toHaveTextContent('GEDCOM 7.0');
    expect(row).toHaveTextContent('importExport.strategies.MERGE_NEWER.label');
    expect(row).toHaveTextContent('importExport.history.created, importExport.history.updated, importExport.history.media');
  });

  it('says so when nothing was imported yet', async () => {
    setup();
    expect(await screen.findByText('importExport.history.empty')).toBeInTheDocument();
  });
});

describe('transfer helpers', () => {
  it('reads the file name from Content-Disposition', () => {
    expect(filenameFrom('attachment; filename="a.zip"', 'x')).toBe('a.zip');
    expect(filenameFrom(null, 'x.zip')).toBe('x.zip');
  });

  it('shortens long lists of persons in a cycle', () => {
    expect(cycleText([['A', 'B']])).toBe('A, B');
    expect(
      cycleText(
        [
          ['A', 'B', 'C'],
          ['D', 'E'],
          ['F', 'G'],
        ],
        2,
        2,
      ),
    ).toBe('A, B, …; D, E; …');
  });

  it('computes the manual summary from the decisions', () => {
    expect(manualSummary(preview, {})).toMatchObject({ updatedPersons: 0, keptPersons: 1 });
    expect(manualSummary(preview, { p1: 'IMPORT' })).toMatchObject({ updatedPersons: 1, keptPersons: 0 });
  });
});
