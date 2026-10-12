import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { IMPORT_HISTORY } from '@/features/transfer/graphql/importQueries';
import { ImportExportPage } from '../ImportExportPage';
import type { ImportPreview, ImportSummary } from '@/features/transfer/lib/transfer';
import { filenameFrom, manualSummary } from '@/features/transfer/lib/transfer';
import { makeTree, treesMock } from '@/test/fixtures';
import { useActiveTreeStore } from '@/stores/activeTreeStore';

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
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  useActiveTreeStore.setState({ treeId: 't1' });
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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
    fetchMock.mockResolvedValueOnce(json(preview));
    setup();
    chooseFile();

    expect(await screen.findByText('importExport.import.summaryTitle')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/import/preview', expect.objectContaining({ method: 'POST' }));
    expect(screen.getByText('importExport.import.backupHint')).toBeInTheDocument();
    expect(summaryRow('keptPersons')).toHaveTextContent('1');

    fireEvent.click(screen.getByLabelText(/importExport.strategies.OVERWRITE.label/));
    expect(summaryRow('removedPersons')).toHaveTextContent('4');
  });

  it('lets the user decide conflicts manually and sends the decisions', async () => {
    fetchMock
      .mockResolvedValueOnce(json(preview))
      .mockResolvedValueOnce(json({ createdPersons: 1, updatedPersons: 1, removedPersons: 0, missingFiles: [], summary: summary() }));
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
    const body = fetchMock.mock.calls[1][1].body as FormData;
    expect(body.get('strategy')).toBe('MERGE_MANUAL');
    expect(JSON.parse(body.get('decisions') as string)).toEqual({ p1: 'IMPORT' });
  });

  it('sends the file to the open family tree and names it', async () => {
    fetchMock.mockResolvedValueOnce(json(preview));
    setup();
    chooseFile();
    await screen.findByText('importExport.import.summaryTitle');
    // ZIP export of the app: by default into the open family tree
    expect(screen.getByLabelText('importExport.import.targetCurrent')).toBeChecked();
    const [, init] = fetchMock.mock.calls[0];
    expect((init.body as FormData).get('target')).toBe('CURRENT');
    expect(init.headers).toEqual({ 'X-Family-Tree-Id': 't1' });
  });

  it('imports a GEDCOM file into a new family tree and opens it', async () => {
    const newTree: ImportPreview = { ...preview, target: 'NEW', existingPersons: 0, conflicts: [], suggestedTreeName: 'Brakenhof' };
    fetchMock
      .mockResolvedValueOnce(json(newTree))
      .mockResolvedValueOnce(
        json({ familyTreeId: 't7', createdPersons: 5, updatedPersons: 0, removedPersons: 0, missingFiles: [], summary: summary({ newPersons: 5 }) }),
      );
    // After the import the list knows the new family tree
    const current = { ...treesMock(), maxUsageCount: 1 };
    setup([], [current, treesMock([makeTree(), makeTree({ id: 't7', name: 'Familie Brakenhof' })])]);
    fireEvent.change(screen.getByLabelText('importExport.import.file'), {
      target: { files: [new File(['0 HEAD'], 'brakenhof.ged', { type: 'text/plain' })] },
    });
    await screen.findByText('importExport.import.summaryTitle');

    expect(screen.getByLabelText('importExport.import.targetNew')).toBeChecked();
    expect((fetchMock.mock.calls[0][1].body as FormData).get('target')).toBe('NEW');
    // Name from the server's suggestion, editable; there are no strategies for a new family tree
    const name = screen.getByLabelText('importExport.import.treeName');
    expect(name).toHaveValue('Brakenhof');
    expect(screen.queryByText('importExport.import.strategy')).not.toBeInTheDocument();
    expect(screen.queryByText('importExport.import.backupHint')).not.toBeInTheDocument();
    fireEvent.change(name, { target: { value: 'Familie Brakenhof' } });

    fireEvent.click(screen.getByRole('button', { name: /importExport.import.run/ }));
    expect(await screen.findByText('importExport.import.successNewTree')).toBeInTheDocument();
    const body = fetchMock.mock.calls[1][1].body as FormData;
    expect(body.get('target')).toBe('NEW');
    expect(body.get('treeName')).toBe('Familie Brakenhof');
    await waitFor(() => expect(useActiveTreeStore.getState().treeId).toBe('t7'));
  });

  it('without a family tree imports only into a new one and offers no export', async () => {
    useActiveTreeStore.setState({ treeId: null });
    fetchMock.mockResolvedValueOnce(json({ ...preview, target: 'NEW', existingPersons: 0, conflicts: [] }));
    setup([], [treesMock([])]);
    // As soon as the (empty) list of family trees is known
    await waitFor(() => expect(screen.queryByText('importExport.export.title')).not.toBeInTheDocument());
    expect(screen.queryByLabelText(/importExport.import.targetCurrent/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('importExport.import.targetNew')).toBeChecked();

    // Also a ZIP file (otherwise meant for the open family tree) goes into a new one
    chooseFile();
    await screen.findByText('importExport.import.summaryTitle');
    expect((fetchMock.mock.calls[0][1].body as FormData).get('target')).toBe('NEW');
  });

  it('checks the file again when the target changes', async () => {
    fetchMock.mockResolvedValueOnce(json(preview)).mockResolvedValueOnce(json({ ...preview, target: 'NEW', existingPersons: 0 }));
    setup();
    chooseFile();
    await screen.findByText('importExport.import.summaryTitle');
    fireEvent.click(screen.getByLabelText('importExport.import.targetNew'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect((fetchMock.mock.calls[1][1].body as FormData).get('target')).toBe('NEW');
    expect(await screen.findByLabelText('importExport.import.treeName')).toHaveValue('Muster');
  });

  it('asks before overwriting existing data', async () => {
    fetchMock.mockResolvedValueOnce(json(preview));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    setup();
    chooseFile();
    fireEvent.click(await screen.findByLabelText(/importExport.strategies.OVERWRITE.label/));
    fireEvent.click(screen.getByRole('button', { name: /importExport.import.run/ }));
    expect(confirm).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors with technical details', async () => {
    fetchMock.mockResolvedValueOnce(json({ reason: 'INVALID_SCHEMA', details: ['persons.0.firstName: Required'] }, 400));
    setup();
    chooseFile();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('importExport.errors.INVALID_SCHEMA');
    expect(alert).toHaveTextContent('persons.0.firstName: Required');
  });

  it('downloads the export with the file name from the server', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Blob(['zip']), {
        headers: { 'Content-Disposition': 'attachment; filename="family_tree_Muster_20260928_120000.zip"', 'X-Missing-Media': '0' },
      }),
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    setup();
    fireEvent.click(screen.getByLabelText('importExport.export.withMedia'));
    fireEvent.click(screen.getByRole('button', { name: /importExport.export.zipButton/ }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/export/zip?media=0', { headers: { 'X-Family-Tree-Id': 't1' } });
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('family_tree_Muster_20260928_120000.zip');
  });

  it('exports GEDCOM with media on request', async () => {
    fetchMock.mockResolvedValueOnce(new Response(new Blob(['zip']), { headers: { 'Content-Disposition': 'attachment; filename="a_gedcom70.gdz"' } }));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    setup();
    fireEvent.change(screen.getByLabelText('importExport.export.gedcomVersion'), { target: { value: '7.0' } });
    fireEvent.click(screen.getByLabelText('importExport.export.gedcomWithMedia'));
    fireEvent.click(screen.getByRole('button', { name: /importExport.export.gedcomButton/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/export/gedcom?version=7.0&media=1', { headers: { 'X-Family-Tree-Id': 't1' } }));
  });

  it('warns about a file that was imported before and reports recognised persons', async () => {
    fetchMock.mockResolvedValueOnce(
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

  it('computes the manual summary from the decisions', () => {
    expect(manualSummary(preview, {})).toMatchObject({ updatedPersons: 0, keptPersons: 1 });
    expect(manualSummary(preview, { p1: 'IMPORT' })).toMatchObject({ updatedPersons: 1, keptPersons: 0 });
  });
});
